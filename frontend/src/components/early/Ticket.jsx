import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { drawTicket, loadTicketFonts, TICKET_W, TICKET_H } from './ticketCanvas';
import { tweetIntent, padTicket } from '../../lib/early';
import { BALL_BITMAP, getCharacter, getSelectedCharId } from '../../mock';

const Ticket = ({ participant, shareText }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const character = getCharacter(getSelectedCharId());

  useEffect(() => {
    let alive = true;
    loadTicketFonts().then(() => alive && ref.current && drawTicket(ref.current, { participant, character, ballBitmap: BALL_BITMAP }));
    return () => {
      alive = false;
    };
  }, [participant, character]);

  const fileName = `futbot-ticket-${padTicket(participant.ticket_no).slice(1)}.png`;
  const text = `${shareText}\n\nTicket ${padTicket(participant.ticket_no)} · @${participant.x_username}`;
  const siteUrl = window.location.origin;

  const toBlob = () => new Promise((res) => ref.current.toBlob(res, 'image/png'));

  const download = async () => {
    const blob = await toBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const share = async () => {
    setBusy(true);
    try {
      const blob = await toBlob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, url: siteUrl });
        return;
      }
      await download();
      toast('Ticket downloaded — attach it to your post.', { description: 'Opening X…' });
      window.open(tweetIntent(text, siteUrl), '_blank', 'noopener');
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('Could not share. Try downloading instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="ticket-wrap">
      <div className="frame-card overflow-hidden p-2">
        <canvas ref={ref} width={TICKET_W} height={TICKET_H} className="block h-auto w-full" style={{ imageRendering: 'pixelated' }} data-testid="ticket-canvas" />
      </div>
      <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button onClick={share} disabled={busy} className="btn-ink" data-testid="ticket-share-x">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />} SHARE ON X
        </button>
        <button onClick={download} className="btn-outline" data-testid="ticket-download">
          <Download size={14} /> DOWNLOAD TICKET
        </button>
      </div>
    </div>
  );
};

export default Ticket;
