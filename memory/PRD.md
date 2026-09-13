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

## Backlog / Next
- Provide real REACT_APP_WALLETCONNECT_PROJECT_ID for WalletConnect/mobile wallets (MetaMask injected already works).
- Set ADMIN_PASSWORD to enable admin panel; ETHERSCAN_API_KEY to enable VIP check.
