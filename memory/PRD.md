# GoalHoodz Early (hoodball7eylul)

## Origin
Cloned from https://github.com/Dostarki/hoodball7eylul and brought up as-is (2026-06).

## Summary
1-bit head-soccer web3 game ("GoalHoodz - Early") on Robinhood Chain (chain id 4663).
Wallet connect (wagmi + RainbowKit) → JWT auth → pick pixel striker → play 60s matches →
5-team league + global leaderboard. Includes an Early-Access list module and a Collabs module
with an admin panel.

## Stack
- Backend: FastAPI + Motor (MongoDB), eth-account (SIWE-style verify) + wallet-connect login, PyJWT.
  Files: backend/server.py (core game), backend/early.py (early list + admin), backend/collab.py (collabs + admin).
- Frontend: React 19 + CRACO, wagmi/viem, RainbowKit, Tailwind, framer-motion.

## Env vars
- backend/.env: MONGO_URL, DB_NAME, CORS_ORIGINS, JWT_SECRET, CHAIN_ID(4663)
  - Optional: ETHERSCAN_API_KEY (VIP on-chain check), ADMIN_PASSWORD (admin panel login)
- frontend/.env: REACT_APP_BACKEND_URL, REACT_APP_WALLETCONNECT_PROJECT_ID (currently placeholder)

## Status (2026-06)
- Cloned, dependencies installed (added eth-account; skipped conflicting emergentintegrations/litellm — unused).
- Backend + frontend running under supervisor. Home page renders.
- Verified end-to-end via curl: /api/auth/connect, /api/me/username, /api/league, /api/matches (league), /api/leaderboard.

## 2026-06 — Game unlocked + LİG PUANLARI
- flags.js GAME_LOCKED=false → League/Play/Leaderboard pages open, Early List hidden from hero & navbar (route /early-list still exists).
- Hero: "CONNECT & PLAY" → /play?mode=league (WalletGate if not connected) + "LİG PUANLARI" button.
- Navbar: Early List + Leaderboard links replaced by single "LİG PUANLARI" (/leaderboard, testid nav-lig-puanlari). League link kept.
- /leaderboard rebuilt as Süper Lig-style table (O G B M A Y AV P), Turkish UI, "MAÇ OYNA" CTA, my-rank banner.
- Backend GET /api/leaderboard: only users with matches>0, sorted points → goal_diff → goals_for → wins; returns goal_diff. Win=3 / Draw=1 already in POST /api/matches.
- Verified via curl (3 test wallets, ranking order correct) + screenshots.

## Backlog / Next
- Provide real REACT_APP_WALLETCONNECT_PROJECT_ID for WalletConnect/mobile wallets (MetaMask injected already works).
- Set ADMIN_PASSWORD to enable admin panel; ETHERSCAN_API_KEY to enable VIP check.
