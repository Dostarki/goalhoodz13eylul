import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { Crown, Loader2, Wallet, RefreshCw, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { earlyApi, TIERS, fmtUsd } from '../../lib/early';
import { errMsg } from '../../lib/api';

const TierLadder = ({ settings, current }) => (
  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="tier-ladder">
    {Object.entries(TIERS).map(([k, t]) => (
      <div key={k} className={`border-2 p-3 ${current === k ? 'bg-[var(--paper)]' : 'opacity-70'}`} style={{ borderColor: current === k ? t.color : 'var(--line)' }}>
        <div className="font-pixel text-[10px]" style={{ color: t.color }}>{t.label}</div>
        <div className="font-mono mt-1 text-[11px] text-[var(--ink-soft)]">≥ {fmtUsd(settings[`${k}_min`])} · +{settings[`${k}_points`]}</div>
      </div>
    ))}
  </div>
);

const VipBox = ({ participant, settings, onUpdate }) => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [showChains, setShowChains] = useState(false);
  const tier = participant.tier ? TIERS[participant.tier] : null;

  const verify = async () => {
    setBusy(true);
    try {
      const { data: n } = await earlyApi.get('/early/vip/nonce');
      const signature = await signMessageAsync({ message: n.message });
      toast('Scanning EVM volume…', { description: 'Ethereum, Arbitrum, Polygon, Linea, Blast, Gnosis, Mantle, Unichain' });
      const { data } = await earlyApi.post('/early/vip/check', { address, message: n.message, signature });
      onUpdate(data.participant);
      if (data.tier) toast.success(`${TIERS[data.tier].label} VIP ticket unlocked · ${fmtUsd(data.volume_usd)} volume${data.bonus_points ? ` · +${data.bonus_points} pts` : ''}`);
      else toast(`Volume ${fmtUsd(data.volume_usd)} — below Bronze (${fmtUsd(settings.bronze_min)}). Standard ticket kept.`);
    } catch (e) {
      if (e?.name !== 'UserRejectedRequestError' && !/rejected/i.test(e?.message || '')) toast.error(errMsg(e, 'Verification failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 border-2 p-5" style={{ borderColor: tier ? tier.color : 'var(--line)', background: 'var(--paper-2)' }} data-testid="vip-box">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label mb-2 flex items-center gap-2"><Crown size={12} /> VIP ticket</div>
          <div className="font-pixel text-[12px] leading-5">
            {tier ? <span style={{ color: tier.color }}>{tier.label} VIP</span> : 'Prove your on-chain volume, upgrade your ticket.'}
          </div>
          <p className="mt-1 text-[13px] leading-6 text-[var(--ink-soft)]">
            {tier
              ? `${fmtUsd(participant.volume_usd)} native volume across your last ${100} txs per chain · ${participant.vip_wallet?.slice(0, 6)}…${participant.vip_wallet?.slice(-4)}`
              : 'Connect a wallet and sign a message (no gas). We sum sent + received native value on major EVM chains and stamp your ticket.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectButton.Custom>
            {({ openConnectModal, openAccountModal, mounted }) =>
              isConnected ? (
                <button onClick={openAccountModal} className="btn-outline !px-3 !py-2.5 !text-[9px]" data-testid="vip-wallet-btn">
                  <Wallet size={11} /> {address.slice(0, 6)}…{address.slice(-4)}
                </button>
              ) : (
                <button onClick={openConnectModal} disabled={!mounted} className="btn-outline !px-4 !py-2.5 !text-[10px]" data-testid="vip-connect-btn">
                  <Wallet size={12} /> CONNECT WALLET
                </button>
              )
            }
          </ConnectButton.Custom>
          {isConnected && (
            <button onClick={verify} disabled={busy} className="btn-ink !px-4 !py-2.5 !text-[10px]" data-testid="vip-verify-btn">
              {busy ? <Loader2 size={12} className="animate-spin" /> : tier ? <RefreshCw size={12} /> : <Crown size={12} />} {tier ? 'RE-CHECK' : 'VERIFY VOLUME'}
            </button>
          )}
        </div>
      </div>
      <TierLadder settings={settings} current={participant.tier} />
      {participant.vip_chains?.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowChains((v) => !v)} className="nav-link flex items-center gap-1 !text-[10px]" data-testid="vip-chains-toggle">
            CHAIN BREAKDOWN <ChevronDown size={11} className={showChains ? 'rotate-180' : ''} />
          </button>
          {showChains && (
            <div className="font-mono mt-3 grid gap-1 text-[11px] sm:grid-cols-2" data-testid="vip-chains">
              {participant.vip_chains.map((c) => (
                <div key={c.chain_id} className="flex justify-between border-b border-[var(--line)] py-1">
                  <span>{c.chain}</span>
                  <span className="text-[var(--ink-soft)]">{c.error ? c.error : `${c.tx_count} tx · ${fmtUsd(c.usd)}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VipBox;
