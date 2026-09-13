import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { adminApi } from '../../lib/early';
import { errMsg } from '../../lib/api';

const cls = 'font-mono rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[13px]';

const Field = ({ label, children }) => (
  <label className="block">
    <div className="label mb-2">{label}</div>
    {children}
  </label>
);

const SettingsForm = () => {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.get('/admin/settings').then((r) => setS(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  const set = (k) => (e) => setS({ ...s, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await adminApi.put('/admin/settings', s);
      setS(data);
      toast.success('Settings saved');
    } catch (ex) {
      toast.error(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  if (!s) return <Loader2 className="animate-spin" size={16} />;

  return (
    <form onSubmit={save} className="grid gap-6 md:grid-cols-[1fr_120px]" data-testid="admin-settings-form">
      <Field label="Follow URL"><Input value={s.follow_url} onChange={set('follow_url')} className={cls} data-testid="set-follow-url" /></Field>
      <Field label="Points"><Input type="number" min={0} value={s.follow_points} onChange={set('follow_points')} className={cls} data-testid="set-follow-points" /></Field>
      <Field label="RT & Like tweet URL"><Input value={s.rt_url} onChange={set('rt_url')} className={cls} data-testid="set-rt-url" /></Field>
      <Field label="Points"><Input type="number" min={0} value={s.rt_points} onChange={set('rt_points')} className={cls} data-testid="set-rt-points" /></Field>
      <Field label="Quote text"><Textarea value={s.quote_text} onChange={set('quote_text')} maxLength={240} rows={3} className={cls} data-testid="set-quote-text" /></Field>
      <Field label="Points"><Input type="number" min={0} value={s.quote_points} onChange={set('quote_points')} className={cls} data-testid="set-quote-points" /></Field>
      <Field label="Quote tweet URL (appended to the post)"><Input value={s.quote_url} onChange={set('quote_url')} className={cls} data-testid="set-quote-url" /></Field>
      <div />
      <div className="label md:col-span-2 mt-4 border-t border-[var(--line)] pt-6">Referral bonus</div>
      <Field label="Referrer gets (points)"><Input type="number" min={0} value={s.referrer_points} onChange={set('referrer_points')} className={cls} data-testid="set-referrer-points" /></Field>
      <div />
      <Field label="Invited friend gets (points)"><Input type="number" min={0} value={s.referred_points} onChange={set('referred_points')} className={cls} data-testid="set-referred-points" /></Field>
      <div />
      <div className="label md:col-span-2 mt-4 border-t border-[var(--line)] pt-6">VIP tiers · min volume (USD) → bonus points</div>
      {['bronze', 'silver', 'gold', 'platinum'].map((t) => (
        <React.Fragment key={t}>
          <Field label={`${t} min volume $`}><Input type="number" min={0} value={s[`${t}_min`]} onChange={set(`${t}_min`)} className={cls} data-testid={`set-${t}-min`} /></Field>
          <Field label="Points"><Input type="number" min={0} value={s[`${t}_points`]} onChange={set(`${t}_points`)} className={cls} data-testid={`set-${t}-points`} /></Field>
        </React.Fragment>
      ))}
      <div className="md:col-span-2 flex justify-end">
        <button type="submit" disabled={busy} className="btn-ink !px-6 !py-3 !text-[10px]" data-testid="settings-save">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} SAVE
        </button>
      </div>
    </form>
  );
};

export default SettingsForm;
