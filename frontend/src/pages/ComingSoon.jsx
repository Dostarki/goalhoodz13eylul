import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import PixelSprite from '../components/PixelSprite';
import { BALL_BITMAP } from '../mock';

const ComingSoon = () => (
  <main className="paper-grid flex min-h-[70vh] items-center justify-center px-5 py-20">
    <div className="frame-card w-full max-w-xl p-10 text-center" data-testid="coming-soon">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-2 border-[var(--ink)] bg-[var(--paper)]">
        <PixelSprite bitmap={BALL_BITMAP} scale={5} ink="var(--ink)" />
      </div>
      <div className="label mb-3 flex items-center justify-center gap-2"><Lock size={11} /> Pitch locked</div>
      <h1 className="font-pixel text-[16px] leading-relaxed md:text-[20px]">Matches open after the Early List.</h1>
      <p className="mt-4 text-[15px] leading-7 text-[var(--ink-soft)]">Secure your Early Access ticket now — points you earn carry into Season 01.</p>
      <Link to="/#early" className="btn-ink mt-8" data-testid="coming-soon-join">JOIN EARLY LIST <ArrowRight size={14} /></Link>
    </div>
  </main>
);

export default ComingSoon;
