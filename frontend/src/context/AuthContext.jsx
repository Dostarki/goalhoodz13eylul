import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useDisconnect, useSwitchChain } from 'wagmi';
import { api, TOKEN_KEY, errMsg } from '../lib/api';
import { robinhood } from '../web3/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // restore session
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .get('/me')
      .then((r) => setUser(r.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  // wallet switched / disconnected -> drop session that doesn't match (ignore while wagmi is still reconnecting)
  useEffect(() => {
    if (!user) return;
    if (status === 'reconnecting' || status === 'connecting') return;
    if (!isConnected || (address && address.toLowerCase() !== user.address)) logout();
  }, [isConnected, address, status, user, logout]);

  // wallet connected -> log in automatically (connection approval = login)
  useEffect(() => {
    if (loading || signing || !isConnected || !address) return;
    if (user && user.address === address.toLowerCase()) return;
    let cancelled = false;
    (async () => {
      setSigning(true);
      setError('');
      try {
        const res = await api.post('/auth/connect', { address });
        if (cancelled) return;
        localStorage.setItem(TOKEN_KEY, res.data.token);
        setUser(res.data.user);
        if (chainId !== robinhood.id) {
          switchChainAsync({ chainId: robinhood.id }).catch(() => {});
        }
      } catch (e) {
        if (!cancelled) setError(errMsg(e, 'Login failed'));
      } finally {
        if (!cancelled) setSigning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, loading]);

  // manual retry (same connection-based login, no signature)
  const signIn = useCallback(async () => {
    if (!isConnected || !address) return;
    setSigning(true);
    setError('');
    try {
      const res = await api.post('/auth/connect', { address });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      if (chainId !== robinhood.id) switchChainAsync({ chainId: robinhood.id }).catch(() => {});
    } catch (e) {
      setError(errMsg(e, 'Login failed'));
    } finally {
      setSigning(false);
    }
  }, [isConnected, address, chainId, switchChainAsync]);

  const setUsername = useCallback(async (username) => {
    const { data } = await api.put('/me/username', { username });
    setUser(data);
    return data;
  }, []);

  const setCharacter = useCallback(async (character_id) => {
    try {
      const { data } = await api.put('/me/character', { character_id });
      setUser(data);
    } catch {
      /* ignore when logged out */
    }
  }, []);

  const fullLogout = useCallback(() => {
    logout();
    disconnect();
  }, [logout, disconnect]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      signing,
      error,
      isConnected,
      address,
      ready: !!user && !!user.username,
      signIn,
      setUsername,
      setCharacter,
      logout: fullLogout,
    }),
    [user, loading, signing, error, isConnected, address, signIn, setUsername, setCharacter, fullLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
