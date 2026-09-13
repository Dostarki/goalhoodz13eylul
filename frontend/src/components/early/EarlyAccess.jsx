import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AtSign, Loader2, Wallet, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import TaskCard from './TaskCard';
import Ticket from './Ticket';
import DailyTasks from './DailyTasks';
import ReferralBox from './ReferralBox';
import VipBox from './VipBox';
import { earlyApi, EARLY_TOKEN, REF_KEY, tweetIntent, padTicket, TIERS } from '../../lib/early';
import { errMsg } from '../../lib/api';

const Step = ({ n, title, active, done, children }) => (
  <div className={`border-t-2 pt-5 ${active || done ? 'border-[var(--ink)]' : 'border-[var(--line)]'} ${!active && !done ? 'opacity-40' : ''}`} data-testid={`early-step-${n}`}>
    <div className="flex items-center gap-3">
      <span className={`font-pixel flex h-8 w-8 items-center justify-center text-[11px] ${done ? 'bg-[var(--ink)] text-[var(--paper)]' : 'border-2 border-[var(--ink)]'}`}>{n}</span>
      <div className="font-pixel text-[12px]">{title}</div>
    </div>
    <div className="mt-4">{children}</div>
  </div>
);

const inputCls = 'font-mono h-12 rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[14px] tracking-wider';

const EarlyAccess = () => {
  const [config, setConfig] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [x, setX] = useState('');
  const [wallet, setWallet] = useState('');
  const [sub, setSub] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) localStorage.setItem(REF_KEY, ref.replace(/^@/, ''));
    earlyApi.get('/early/config').then((r) => setConfig(r.data)).catch(() => {});
    if (localStorage.getItem(EARLY_TOKEN)) {
      earlyApi.get('/early/me').then((r) => setParticipant(r.data)).catch(() => localStorage.removeItem(EARLY_TOKEN));
    }
  }, []);

  const register = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { data } = await earlyApi.post('/early/register', { x_username: x, wallet, ref: localStorage.getItem(REF_KEY) || null });
      localStorage.setItem(EARLY_TOKEN, data.token);
      setParticipant(data.participant);
      toast.success(`Welcome @${data.participant.x_username} — ticket ${padTicket(data.participant.ticket_no)} reserved.`);
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const complete = useCallback(async (task) => {
    try {
      const { data } = await earlyApi.post(`/early/tasks/${task}/complete`);
      setParticipant(data);
      toast.success(`+${config.settings[`${task}_points`]} points`);
    } catch (ex) {
      toast.error(errMsg(ex));
    }
  }, [config]);

  const completeDaily = useCallback(async (id) => {
    try {
      const { data } = await earlyApi.post(`/early/daily/${id}/complete`);
      setParticipant(data);
      toast.success('Daily task completed');
    } catch (ex) {
      toast.error(errMsg(ex));
    }
  }, []);

  const reset = () => {
    localStorage.removeItem(EARLY_TOKEN);
    setParticipant(null);
    setSub(1);
    setX('');
    setWallet('');
  };

  if (!config) {
    return (
      <div className="flex justify-center py-10 text-[var(--ink-soft)]"><Loader2 className="animate-spin" size={16} /></div>
    );
  }
  const s = config.settings;
  const registered = !!participant;
  const completed = !!participant?.completed;

  return (
    <div className="frame-card mx-auto w-full max-w-3xl p-6 md:p-10" data-testid="early-access">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label mb-3">Early List · Season 01</div>
          <h2 className="font-pixel text-[16px] leading-relaxed md:text-[20px]">Claim your Early Access ticket.</h2>
          <p className="mt-3 text-[15px] leading-7 text-[var(--ink-soft)]">Enter your X handle and wallet, finish three X tasks, and mint a pixel match ticket. Points are recorded on the Early List.</p>
        </div>
        {registered && (
          <div className="font-mono flex items-center gap-2 border-2 border-[var(--ink)] px-3 py-2 text-[11px] tracking-widest" data-testid="early-points">
            {participant.tier && <span className="font-pixel text-[9px]" style={{ color: TIERS[participant.tier].color }} data-testid="early-tier">{TIERS[participant.tier].label}</span>}
            @{participant.x_username} · {participant.points} PTS
          </div>
        )}
      </div>
      {!registered && localStorage.getItem(REF_KEY) && (
        <div className="font-mono mt-4 inline-block border border-[var(--accent)] px-3 py-1.5 text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="ref-banner">
          INVITED BY @{localStorage.getItem(REF_KEY)} · +{s.referred_points} BONUS ON TICKET
        </div>
      )}

      <div className="mt-8 space-y-8">
        <Step n="1" title="Your X username" active={!registered && sub === 1} done={registered || sub > 1}>
          {!registered && sub === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); setSub(2); }} className="flex flex-col gap-3 sm:flex-row" data-testid="x-form">
              <div className="relative flex-1">
                <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                <Input value={x} onChange={(e) => setX(e.target.value.replace(/^@/, ''))} placeholder="goalhoodz" maxLength={15} className={`${inputCls} pl-9`} data-testid="x-username-input" />
              </div>
              <button type="submit" disabled={x.trim().length < 1} className="btn-ink" data-testid="x-username-next">NEXT <ArrowRight size={14} /></button>
            </form>
          ) : (
            <div className="font-pixel text-[12px]" data-testid="x-username-value">@{registered ? participant.x_username : x}</div>
          )}
        </Step>

        <Step n="2" title="Your wallet address" active={!registered && sub === 2} done={registered}>
          {!registered && sub === 2 && (
            <form onSubmit={register} className="flex flex-col gap-3" data-testid="wallet-form">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                  <Input value={wallet} onChange={(e) => setWallet(e.target.value.trim())} placeholder="0x…" maxLength={42} className={`${inputCls} pl-9`} data-testid="wallet-input" />
                </div>
                <button type="submit" disabled={busy || !/^0x[a-fA-F0-9]{40}$/.test(wallet)} className="btn-ink" data-testid="wallet-submit">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null} REGISTER
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setSub(1)} className="nav-link !text-[10px]" data-testid="wallet-back">BACK</button>
                {err && <div className="font-mono text-[12px] text-red-700" data-testid="register-error">{err}</div>}
              </div>
            </form>
          )}
          {registered && <div className="font-mono text-[12px] tracking-wider" data-testid="wallet-value">{participant.wallet_short}</div>}
        </Step>

        <Step n="3" title="X tasks" active={registered && !completed} done={completed}>
          <div className="space-y-3">
            <TaskCard id="follow" title="Follow @goalhoodz" desc="Follow the official GoalHoodz account on X." points={s.follow_points} url={s.follow_url} done={!!participant?.tasks.follow} onComplete={complete} disabled={!registered} />
            <TaskCard id="rt" title="Repost & Like" desc="Repost and like the pinned announcement." points={s.rt_points} url={s.rt_url} done={!!participant?.tasks.rt} onComplete={complete} disabled={!registered} />
            <TaskCard id="quote" title="Quote post" desc={`"${s.quote_text}"`} points={s.quote_points} url={tweetIntent(s.quote_text, s.quote_url)} done={!!participant?.tasks.quote} onComplete={complete} disabled={!registered} />
          </div>
        </Step>

        <Step n="4" title="Your match ticket" active={completed} done={completed}>
          {completed ? (
            <>
              <Ticket participant={participant} shareText={s.quote_text} />
              <VipBox participant={participant} settings={s} onUpdate={setParticipant} />
              <ReferralBox participant={participant} settings={s} />
              <DailyTasks tasks={config.daily_tasks} participant={participant} today={config.today} onComplete={completeDaily} />
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
                <Link to="/early-list" className="btn-outline !px-4 !py-3 !text-[10px]" data-testid="go-early-list"><ListOrdered size={12} /> VIEW EARLY LIST</Link>
                <button onClick={reset} className="nav-link !text-[10px]" data-testid="early-switch-account">SWITCH ACCOUNT</button>
              </div>
            </>
          ) : (
            <p className="text-[14px] leading-6 text-[var(--ink-soft)]">Finish all three tasks to generate your ticket and join the Early List.</p>
          )}
        </Step>
      </div>
    </div>
  );
};

export default EarlyAccess;
