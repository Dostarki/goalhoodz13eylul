import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useDisconnect, useSwitchChain } from 'wagmi';
import { api, TOKEN_KEY, errMsg, nftGateOf } from '../lib/api';
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
  const [nftGate, setNftGate] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // any API call rejected with NFT_REQUIRED -> drop session, show gate
  useEffect(() => {
    const onGate = (e) => {
      setNftGate(e.detail);
      logout();
    };
    window.addEventListener('futbot-nft-required', onGate);
    return () => window.removeEventListener('futbot-nft-required', onGate);
  }, [logout]);

  // wallet switched -> reset gate state
  useEffect(() => {
    setNftGate(null);
  }, [address, isConnected]);

  const login = useCallback(async () => {
    try {
      const res = await api.post('/auth/connect', { address });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setNftGate(null);
      setUser(res.data.user);
      if (chainId !== robinhood.id) switchChainAsync({ chainId: robinhood.id }).catch(() => {});
      return true;
    } catch (e) {
      if (!nftGateOf(e)) setError(errMsg(e, 'Login failed'));
      return false;
    }
  }, [address, chainId, switchChainAsync]);

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
      await login();
      if (!cancelled) setSigning(false);
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
    await login();
    setSigning(false);
  }, [isConnected, address, login]);

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
      nftGate,
      isConnected,
      address,
      ready: !!user && !!user.username,
      signIn,
      setUsername,
      setCharacter,
      logout: fullLogout,
    }),
    [user, loading, signing, error, nftGate, isConnected, address, signIn, setUsername, setCharacter, fullLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
