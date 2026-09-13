import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-[var(--line)] bg-[var(--paper)]">
    <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-14 md:grid-cols-[1.6fr_1fr_1fr] md:px-10">
      <div>
        <div className="label mb-4">GoalHoodz - Early</div>
        <p className="font-mono text-[12px] leading-6 text-[var(--ink-soft)]">
          1-bit head soccer league on Robinhood Chain. Ink on paper, ball on ink.
          <br />
          &copy; 2026 GoalHoodz. All pixel characters are original artwork.
        </p>
      </div>
      <div>
        <div className="label mb-4">Play</div>
        <ul className="font-mono space-y-2 text-[12px] text-[var(--ink-soft)]">
          <li><Link className="hover:text-[var(--ink)]" to="/league">League Table</Link></li>
          <li><Link className="hover:text-[var(--ink)]" to="/play?mode=quick">Quick Match</Link></li>
          <li><Link className="hover:text-[var(--ink)]" to="/leaderboard">Leaderboard</Link></li>
        </ul>
      </div>
      <div>
        <div className="label mb-4">Project</div>
        <ul className="font-mono space-y-2 text-[12px] text-[var(--ink-soft)]">
          <li><Link className="hover:text-[var(--ink)]" to="/#how-to-play">How to Play</Link></li>
          <li><Link className="hover:text-[var(--ink)]" to="/#arenas">Arenas</Link></li>
          <li><a className="hover:text-[var(--ink)]" href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">Robinhood Chain Explorer</a></li>
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;
