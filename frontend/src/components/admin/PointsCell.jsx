import React, { useState } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../lib/early';
import { errMsg } from '../../lib/api';

const PointsCell = ({ row, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(row.points);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const n = parseInt(val, 10);
    if (Number.isNaN(n) || n < 0) return toast.error('Points must be a number ≥ 0');
    setBusy(true);
    try {
      const { data } = await adminApi.put(`/admin/participants/${row.id}/points`, { points: n });
      onSaved(data);
      toast.success(`@${row.x_username} → ${n} pts`);
      setEditing(false);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => { setVal(row.points); setEditing(false); };

  if (!editing) {
    return (
      <span className="inline-flex items-center justify-end gap-2">
        <span data-testid={`points-value-${row.ticket_no}`}>{row.points}</span>
        <button onClick={() => setEditing(true)} className="text-[var(--ink-soft)] hover:text-[var(--ink)]" title="Edit points" data-testid={`points-edit-${row.ticket_no}`}>
          <Pencil size={11} />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-end gap-1">
      <input
        type="number" min="0" value={val} autoFocus disabled={busy}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        className="font-mono h-7 w-20 border-2 border-[var(--ink)] bg-[var(--paper)] px-2 text-right text-[12px] outline-none"
        data-testid={`points-input-${row.ticket_no}`}
      />
      <button onClick={save} disabled={busy} className="p-1 text-[var(--accent)]" title="Save" data-testid={`points-save-${row.ticket_no}`}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button onClick={cancel} disabled={busy} className="p-1 text-[var(--ink-soft)]" title="Cancel" data-testid={`points-cancel-${row.ticket_no}`}>
        <X size={12} />
      </button>
    </span>
  );
};

export default PointsCell;
