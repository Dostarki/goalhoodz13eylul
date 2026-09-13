import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, PenLine, UserRound, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../lib/api';
import { isEmbedded } from '../web3/config';

const EmbeddedNotice = () => {
  if (!isEmbedded()) return null;
  return (
    <div className="mt-6 flex flex-col gap-3 border-2 border-[var(--ink)] bg-[var(--paper)] p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="embedded-notice">
      <p className="font-mono text-[12px] leading-5 tracking-wider">
        Browser wallet extensions may not open inside this embedded preview. Open the app in its own tab to connect.
      </p>
      <a href={window.location.href} target="_blank" rel="noreferrer" className="btn-outline shrink-0 !px-4 !py-3 !text-[10px]" data-testid="open-new-tab-btn">
        OPEN IN NEW TAB <ExternalLink size={12} />
      </a>
    </div>
  );
};

const Step = ({ n, title, text, active, done, children }) => (
  <div className={`border-t-2 pt-5 ${active || done ? 'border-[var(--ink)]' : 'border-[var(--line)]'} ${!active && !done ? 'opacity-50' : ''}`}>
    <div className="flex items-center gap-3">
      <span className={`font-pixel flex h-8 w-8 items-center justify-center text-[11px] ${done ? 'bg-[var(--ink)] text-[var(--paper)]' : 'border-2 border-[var(--ink)]'}`}>{n}</span>
      <div className="font-pixel text-[12px]">{title}</div>
    </div>
    <p className="mt-3 text-[14px] leading-6 text-[var(--ink-soft)]">{text}</p>
    <div className="mt-4">{children}</div>
  </div>
);

export const UsernameForm = ({ onDone }) => {
  const { setUsername } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await setUsername(name);
      onDone && onDone();
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row" data-testid="username-form">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. pixel_striker"
        maxLength={16}
        className="font-mono h-12 rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[14px] tracking-wider"
        data-testid="username-input"
      />
      <button type="submit" disabled={busy || name.trim().length < 3} className="btn-ink" data-testid="username-submit">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <UserRound size={14} />} SAVE NAME
      </button>
      {err && <div className="font-mono text-[12px] text-red-700 sm:self-center" data-testid="username-error">{err}</div>}
    </form>
  );
};

// Full gate panel: connect -> sign -> username
const WalletGate = ({ title = 'Connect to play', subtitle }) => {
  const { user, isConnected, signIn, signing, error, loading } = useAuth();
  const signed = !!user;
  const named = !!user?.username;

  return (
    <div className="frame-card mx-auto w-full max-w-2xl p-6 md:p-10" data-testid="wallet-gate">
      <div className="label mb-3">Wallet Checkpoint</div>
      <h2 className="font-pixel text-[16px] leading-relaxed md:text-[20px]">{title}</h2>
      {subtitle && <p className="mt-3 text-[15px] leading-7 text-[var(--ink-soft)]">{subtitle}</p>}
      <EmbeddedNotice />

      <div className="mt-8 space-y-8">
        <Step n="1" title="Connect Wallet" text="Approve the connection in your wallet on Robinhood Chain (ETH). That single approval logs you in. No transaction, no gas." active={!signed} done={signed}>
          <div className="flex flex-wrap items-center gap-4" data-testid="gate-connect">
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
            {isConnected && !signed && (signing || loading) && (
              <span className="font-mono flex items-center gap-2 text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="gate-logging-in">
                <Loader2 size={12} className="animate-spin" /> LOGGING IN
              </span>
            )}
          </div>
          {signed && <div className="font-mono mt-3 text-[12px] tracking-wider text-[var(--ink-soft)]">Logged in as {user.address.slice(0, 6)}...{user.address.slice(-4)}</div>}
          {error && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[12px] text-red-700" data-testid="gate-error">{error}</span>
              <button onClick={signIn} className="btn-outline !px-3 !py-2 !text-[9px]" data-testid="gate-retry-btn"><PenLine size={11} /> RETRY</button>
            </div>
          )}
        </Step>
        <Step n="2" title="Pick a Username" text="This is the name other players will see on the leaderboard." active={signed && !named} done={named}>
          {signed && !named && <UsernameForm />}
          {named && <div className="font-pixel text-[12px]">@{user.username}</div>}
        </Step>
      </div>
    </div>
  );
};

export const UsernameDialog = () => {
  const { user } = useAuth();
  const open = !!user && !user.username;
  return (
    <Dialog open={open}>
      <DialogContent className="rounded-none border-2 border-[var(--ink)] bg-[var(--paper-2)] sm:max-w-md" data-testid="username-dialog">
        <DialogHeader>
          <DialogTitle className="font-pixel text-[14px] leading-relaxed">Choose your username</DialogTitle>
          <DialogDescription className="text-[14px] leading-6 text-[var(--ink-soft)]">
            3-16 characters, letters, numbers and underscores. Shown on the leaderboard and in every match.
          </DialogDescription>
        </DialogHeader>
        <UsernameForm />
      </DialogContent>
    </Dialog>
  );
};

export const ConnectPill = () => {
  const { user, logout } = useAuth();
  if (user?.username) {
    return (
      <div className="flex items-center gap-3" data-testid="nav-user-pill">
        <div className="font-mono hidden items-center gap-2 border border-[var(--ink)] px-3 py-1.5 text-[11px] tracking-widest sm:flex">
          <Wallet size={12} /> @{user.username} &middot; {user.points} PTS
        </div>
        <button onClick={logout} className="nav-link text-[11px]" data-testid="nav-logout">Log out</button>
      </div>
    );
  }
  return (
    <ConnectButton.Custom>
      {({ openConnectModal, account, mounted }) => (
        <button onClick={openConnectModal} className="btn-outline !px-4 !py-2.5 !text-[10px]" data-testid="nav-connect-btn" disabled={!mounted}>
          <Wallet size={12} /> {account ? 'LOGGING IN' : 'CONNECT'} <ArrowRight size={12} />
        </button>
      )}
    </ConnectButton.Custom>
  );
};

export default WalletGate;
