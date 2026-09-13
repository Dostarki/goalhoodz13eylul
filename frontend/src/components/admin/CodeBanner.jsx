import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const CodeBanner = ({ code, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied');
    } catch {
      toast.error('Copy failed — select the code manually');
    }
  };
  return (
    <div className="border-2 border-[var(--accent)] bg-[rgba(127,168,139,0.14)] p-5" data-testid="collab-code-banner">
      <div className="label !mb-0 text-[9px]">New collab code — save it now</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <code className="font-pixel break-all text-[13px] leading-relaxed" data-testid="collab-code-value">{code}</code>
        <div className="flex gap-2">
          <button onClick={copy} className="btn-outline !px-4 !py-2 !text-[10px]" data-testid="collab-code-copy">{copied ? <Check size={12} /> : <Copy size={12} />} COPY CODE</button>
          <button onClick={onDismiss} className="nav-link text-[10px]" data-testid="collab-code-dismiss">Hide</button>
        </div>
      </div>
      <div className="font-mono mt-3 text-[9px] tracking-widest text-[var(--ink-soft)]">IT WILL NOT BE DISPLAYED AGAIN. ROTATE IT IF IT IS LOST.</div>
    </div>
  );
};

export default CodeBanner;
