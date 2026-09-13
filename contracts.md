# Futbot League – API Contracts

## Auth (wallet, SIWE-style)
- `GET  /api/auth/nonce?address=0x..` → `{ nonce }` (5 min TTL, single use)
- `POST /api/auth/verify { address, message, signature }` → `{ token, user }`
  - Server rebuilds expected message text from nonce, checks domain + chain 4663, recovers signer via eth_account.
- `GET  /api/me` (Bearer) → user
- `PUT  /api/me/username { username }` (Bearer) → user (3–16 chars, a-z0-9_ , unique, case-insensitive)

User: `{ address, username|null, points, wins, draws, losses, goals_for, goals_against, matches, created_at }`

## Opponents
- `GET /api/opponent` → `{ username, char_id }` random human-like username (never labelled bot)

## League (per user, stored in DB)
- `GET  /api/league` (Bearer) → `{ round, opponents:[{username,char_id}] x5, results:[[{home,away,hs,as,arena}]...] }`
  - Auto-creates a league with 5 random opponents on first call.
- `POST /api/league/reset` (Bearer) → fresh league
- `POST /api/matches { mode:'league'|'quick', opponent_username, opponent_char_id, player_goals, opponent_goals, arena, character_id }` (Bearer)
  → `{ match, user, league }`. Awards points to user (win 3 / draw 1) for BOTH modes; league mode also advances round & simulates other fixtures.
- `GET  /api/matches/me` (Bearer) → last 20 matches

## Leaderboard
- `GET /api/leaderboard?limit=50` → `[ { rank, username, address, points, wins, draws, losses, goals_for, goals_against, matches } ]`

## Frontend integration
- mock.js keeps: characters bitmaps, arenas, ROUNDS schedule, controls/features copy. League/standing logic moves server-side; localStorage retains only character choice + sound.
- `AuthContext`: wagmi connect → sign → JWT in localStorage (`futbot.token`) → `/api/me`; if no username → UsernameDialog.
- Gate: `/play` and "Start League" require authenticated user with username.
- Opponent names come from backend (league opponents or `/api/opponent`).
