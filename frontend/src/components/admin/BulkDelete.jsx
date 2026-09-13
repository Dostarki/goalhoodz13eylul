import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../ui/alert-dialog';
import { adminApi } from '../../lib/early';
import { errMsg } from '../../lib/api';

const BulkDelete = ({ id, count, label, title, samples, confirmText, payload, onDone }) => {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const locked = !!confirmText && typed.trim() !== confirmText;

  const run = async (e) => {
    e.preventDefault();
    if (locked) return;
    setBusy(true);
    try {
      const r = await adminApi.post('/admin/participants/bulk-delete', { ...payload, confirm: typed.trim() });
      toast.success(`${r.data.deleted} participant${r.data.deleted === 1 ? '' : 's'} deleted`);
      setTyped('');
      onDone(r.data.deleted);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog onOpenChange={(o) => !o && setTyped('')}>
      <AlertDialogTrigger asChild>
        <button className="font-mono flex items-center gap-2 border-2 border-red-700 bg-red-700 px-3 py-2 text-[10px] tracking-widest text-white hover:bg-red-800" data-testid={`bulk-delete-${id}-btn`}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} {label}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-none border-2 border-[var(--ink)] bg-[var(--paper)]" data-testid={`bulk-delete-${id}-dialog`}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-pixel text-[13px] leading-relaxed">{title}</AlertDialogTitle>
          <AlertDialogDescription className="font-mono text-[12px]" asChild>
            <div>
              <span className="font-bold text-red-700" data-testid={`bulk-delete-${id}-count`}>{count}</span> participant{count === 1 ? '' : 's'} will be removed permanently. This cannot be undone.
              {samples?.length > 0 && (
                <div className="mt-2 text-[11px] text-[var(--ink-soft)]" data-testid={`bulk-delete-${id}-samples`}>
                  e.g. {samples.map((s) => `@${s}`).join(', ')}{count > samples.length ? ` … +${count - samples.length} more` : ''}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText && (
          <label className="font-mono block text-[11px]">
            Type <span className="font-bold">{confirmText}</span> to confirm
            <input
              value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
              className="mt-1 h-9 w-full border-2 border-[var(--ink)] bg-[var(--paper-2)] px-2 text-[12px] outline-none"
              data-testid={`bulk-delete-${id}-confirm-input`}
            />
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="font-mono rounded-none border-2 border-[var(--ink)]" data-testid={`bulk-delete-${id}-cancel`}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={run} disabled={locked || busy} className="font-mono rounded-none bg-red-700 text-white hover:bg-red-800 disabled:opacity-40" data-testid={`bulk-delete-${id}-confirm`}>
            Delete {count}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDelete;
