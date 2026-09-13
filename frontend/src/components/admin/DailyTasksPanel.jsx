import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { adminApi } from '../../lib/early';
import { errMsg } from '../../lib/api';

const cls = 'font-mono rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[13px]';
const EMPTY = { title: '', url: '', points: 10 };

const DailyTasksPanel = () => {
  const [tasks, setTasks] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => adminApi.get('/admin/daily-tasks').then((r) => setTasks(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.post('/admin/daily-tasks', { ...form, points: Number(form.points), active: true });
      setForm(EMPTY);
      toast.success('Daily task added');
      load();
    } catch (ex) {
      toast.error(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (t) => {
    await adminApi.put(`/admin/daily-tasks/${t.id}`, { title: t.title, url: t.url, points: t.points, active: !t.active });
    load();
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    await adminApi.delete(`/admin/daily-tasks/${t.id}`);
    load();
  };

  return (
    <div data-testid="admin-daily-panel">
      <form onSubmit={add} className="grid gap-3 md:grid-cols-[1.2fr_1.5fr_100px_auto]" data-testid="daily-add-form">
        <Input placeholder="Task title (e.g. Like today's post)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={cls} data-testid="daily-title" />
        <Input placeholder="https://x.com/... (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={cls} data-testid="daily-url" />
        <Input type="number" min={0} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className={cls} data-testid="daily-points" />
        <button type="submit" disabled={busy || form.title.trim().length < 2} className="btn-ink !px-4 !py-2 !text-[10px]" data-testid="daily-add">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} ADD
        </button>
      </form>

      <div className="mt-8 border border-[var(--line)] bg-[var(--paper)]">
        {!tasks && <div className="p-6"><Loader2 className="animate-spin" size={16} /></div>}
        {tasks && tasks.length === 0 && <div className="font-mono p-6 text-center text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="daily-empty">NO DAILY TASKS YET</div>}
        {tasks?.map((t, i) => (
          <div key={t.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${i > 0 ? 'border-t border-[var(--line)]' : ''} ${t.active ? '' : 'opacity-50'}`} data-testid={`daily-row-${t.id}`}>
            <div>
              <div className="font-pixel text-[11px]">{t.title}</div>
              <div className="font-mono mt-1 text-[11px] text-[var(--ink-soft)]">{t.url || '—'} · +{t.points} pts · {t.active ? 'ACTIVE' : 'PAUSED'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(t)} className="btn-outline !px-3 !py-2 !text-[9px]" data-testid={`daily-toggle-${t.id}`}><Power size={11} /> {t.active ? 'PAUSE' : 'ACTIVATE'}</button>
              <button onClick={() => remove(t)} className="btn-outline !px-3 !py-2 !text-[9px]" data-testid={`daily-delete-${t.id}`}><Trash2 size={11} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyTasksPanel;
