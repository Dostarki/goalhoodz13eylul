import React from 'react';
import { ExternalLink, RefreshCw, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OPENSEA_URL = process.env.REACT_APP_OPENSEA_URL;

const NftGate = () => {
  const { nftGate, signIn, signing, address, logout } = useAuth();
  const url = nftGate?.opensea_url || OPENSEA_URL;
  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  return (
    <div className="mt-8 border-2 border-[var(--ink)] bg-[var(--paper)] p-6 md:p-8" data-testid="nft-gate">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center bg-[var(--ink)] text-[var(--paper)]"><ShieldAlert size={16} /></span>
        <div className="font-pixel text-[12px] md:text-[14px]">GOALHOODZ NFT REQUIRED</div>
      </div>
      <p className="mt-4 text-[15px] leading-7 text-[var(--ink-soft)]">
        Wallet <span className="font-mono text-[var(--ink)]" data-testid="nft-gate-address">{short}</span> does not hold a GoalHoodz NFT on Robinhood Chain.
        The pitch is holders-only: grab one on OpenSea, then come back and re-check.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a href={url} target="_blank" rel="noreferrer" className="btn-ink" data-testid="nft-gate-opensea-btn">
          GET NFT ON OPENSEA <ExternalLink size={13} />
        </a>
        <button onClick={signIn} disabled={signing} className="btn-outline" data-testid="nft-gate-recheck-btn">
          {signing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} RE-CHECK WALLET
        </button>
        <button onClick={logout} className="nav-link text-[11px] sm:ml-auto" data-testid="nft-gate-disconnect-btn">
          <LogOut size={11} className="mr-1 inline" /> Disconnect
        </button>
      </div>
      {nftGate?.contract && (
        <div className="font-mono mt-5 break-all text-[10px] tracking-wider text-[var(--ink-soft)]" data-testid="nft-gate-contract">
          CONTRACT {nftGate.contract} &middot; CHAIN {nftGate.chain_id}
        </div>
      )}
    </div>
  );
};

export default NftGate;
