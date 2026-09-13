import React, { useState } from 'react';
import { Copy, Check, Users, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { referralLink, tweetIntent } from '../../lib/early';

const ReferralBox = ({ participant, settings }) => {
  const [copied, setCopied] = useState(false);
  const link = referralLink(participant.x_username);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copy your referral link', link);
    }
    setCopied(true);
    toast.success('Referral link copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const share = () => window.open(tweetIntent(`Grab your GoalHoodz Early Access ticket with my link — we both earn bonus points.`, link), '_blank', 'noopener');

  return (
    <div className="mt-10 border-2 border-[var(--line)] bg-[var(--paper-2)] p-5" data-testid="referral-box">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label mb-2 flex items-center gap-2"><Users size={12} /> Invite friends</div>
          <div className="font-pixel text-[12px] leading-5">Share your link. You get +{settings.referrer_points}, they get +{settings.referred_points}.</div>
          <p className="mt-1 text-[13px] leading-6 text-[var(--ink-soft)]">Bonus is paid when your friend finishes the X tasks and mints a ticket.</p>
        </div>
        <div className="font-mono border-2 border-[var(--ink)] px-3 py-2 text-[11px] tracking-widest" data-testid="referral-stats">
          {participant.referrals} JOINED · +{participant.referral_points} PTS
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="font-mono flex h-12 flex-1 items-center overflow-hidden border-2 border-[var(--ink)] bg-[var(--paper)] px-3 text-[12px] tracking-wider" data-testid="referral-link">
          <span className="truncate">{link}</span>
        </div>
        <button onClick={copy} className="btn-ink !px-4 !py-3 !text-[10px]" data-testid="referral-copy">
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'COPIED' : 'COPY LINK'}
        </button>
        <button onClick={share} className="btn-outline !px-4 !py-3 !text-[10px]" data-testid="referral-share">
          <Share2 size={12} /> POST
        </button>
      </div>
      {participant.referred_by && (
        <div className="font-mono mt-3 text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="referred-by">INVITED BY @{participant.referred_by}</div>
      )}
    </div>
  );
};

export default ReferralBox;
