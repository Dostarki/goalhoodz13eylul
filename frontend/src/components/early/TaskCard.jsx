import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

const WAIT = 6;

// Honor-system X task: open link -> short countdown -> confirm
const TaskCard = ({ id, title, desc, points, url, done, onComplete, disabled }) => {
  const [phase, setPhase] = useState('idle');
  const [left, setLeft] = useState(WAIT);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (phase !== 'waiting') return;
    if (left <= 0) {
      setPhase('ready');
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);

  const open = () => {
    window.open(url, '_blank', 'noopener');
    setLeft(WAIT);
    setPhase('waiting');
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await onComplete(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 border-2 p-5 sm:flex-row sm:items-center sm:justify-between ${done ? 'border-[var(--ink)] bg-[var(--paper)]' : 'border-[var(--line)] bg-[var(--paper-2)]'} ${disabled ? 'opacity-50' : ''}`} data-testid={`task-${id}`}>
      <div className="flex items-start gap-4">
        <span className={`font-pixel mt-0.5 flex h-8 min-w-8 shrink-0 items-center justify-center px-1.5 text-[9px] ${done ? 'bg-[var(--ink)] text-[var(--paper)]' : 'border-2 border-[var(--ink)]'}`}>
          {done ? <Check size={14} /> : `+${points}`}
        </span>
        <div>
          <div className="font-pixel text-[12px] leading-5">{title}</div>
          <p className="mt-1 text-[13px] leading-6 text-[var(--ink-soft)]">{desc}</p>
          <div className="font-mono mt-1 text-[10px] tracking-widest text-[var(--accent)]">+{points} POINTS</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {done ? (
          <span className="font-mono flex items-center gap-2 text-[11px] tracking-widest" data-testid={`task-${id}-done`}><Check size={12} /> DONE</span>
        ) : phase === 'idle' ? (
          <button onClick={open} disabled={disabled} className="btn-outline !px-4 !py-3 !text-[10px]" data-testid={`task-${id}-open`}>
            OPEN X <ExternalLink size={12} />
          </button>
        ) : (
          <>
            <button onClick={open} className="nav-link !text-[10px]" data-testid={`task-${id}-reopen`}>REOPEN</button>
            <button onClick={confirm} disabled={phase !== 'ready' || busy} className="btn-ink !px-4 !py-3 !text-[10px]" data-testid={`task-${id}-confirm`}>
              {busy ? <Loader2 size={12} className="animate-spin" /> : phase === 'ready' ? <Check size={12} /> : null}
              {phase === 'ready' ? `I'VE DONE IT` : `VERIFY IN ${left}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
