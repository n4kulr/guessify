# Guessify

A record-shop-styled music guessing game. Log in with Spotify, pick a playlist (or Liked Songs), and name the track from short snippets that grow longer as you miss. Score more for guessing sooner — and get a bonus if you nail the artist too.

Play solo, or **host a game** so friends can join from their phones (nickname only, no Spotify) and race for the first correct title.

**Live:** [guessify-black.vercel.app](https://guessify-black.vercel.app)

---

## What you can do

### Solo
- Log in with Spotify Premium
- Pick **Liked Songs** or a playlist you own (others’ playlists show locked)
- Hear unlocking snippets (1 → 2 → 4 → 7 → 11 → 16 seconds)
- Type **title** and **artist** (fuzzy match); correct title wins the round
- Correct artist adds **+1** bonus
- Scrub / play / pause on the vinyl; skip unlocks more audio

### Multiplayer
- Host logs in with Spotify, picks a playlist, shares a **QR + room code**
- Guests open `/join/CODE` or type the code on the home screen — no Spotify
- Everyone picks a nickname, peep avatar (Open Peeps), and accent color
- Host DJs audio on their device and can guess too; **only the DJ can skip**
- First correct title wins the round; shared unlock bar advances on wrongs / skips

---

## How it’s made

| Layer | Stack | Role |
| --- | --- | --- |
| **UI** | React 18 + Vite | Landing, playlist picker, solo game, multiplayer lobby / race |
| **Auth & Spotify data** | Vercel serverless (`api/`) | OAuth, session cookie, playlists, Liked Songs, track lists, Web Playback token |
| **Playback** | Spotify Web Playback SDK | Full-track streaming in the browser (Premium required for host / solo) |
| **Realtime rooms** | Cloudflare Workers + [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver) + Durable Objects | Authoritative multiplayer state, guesses, first-correct wins |
| **Client sockets** | [PartySocket](https://www.npmjs.com/package/partysocket) | Browser ↔ Worker WebSocket |

### Repo map

```
api/                 Spotify OAuth + playlist/liked proxies (Vercel)
party/               Multiplayer Worker (room.js + worker entry)
public/peeps/        Open Peeps bust avatars for multiplayer
src/
  components/        Solo UI (Home, Game, PlaylistPicker, DemoPreview, …)
  multiplayer/       Host/guest apps, avatars, PartySocket hook
  match.js           Fuzzy title/artist matching
  useSpotifyPlayer.js
wrangler.jsonc       Cloudflare Worker config (Durable Object + SQLite migration)
```

Session: encrypted **http-only cookie** (no DB). Spotify Client Secret stays on the server.

Avatars: 105 Open Peeps busts in `public/peeps/` (from Flat Assets); lobby is nickname + randomize + accent.

---

## Scoring

Each round has **6 guesses**. Unlock steps: **1 → 2 → 4 → 7 → 11 → 16** seconds.

| Guess attempt | Points (title) |
| --- | --- |
| 1st | 6 |
| … | … |
| 6th | 1 |

Correct **artist** (independent fuzzy match) → **+1** bonus.

---

## Deploy

### 1. Spotify app
1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → create an app  
2. Copy **Client ID** and **Client Secret**  
3. Add redirect URI after you have a Vercel URL (step 3)

### 2. Vercel (site + API)
Import the GitHub repo. Add env vars:

| Name | Value |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | Spotify dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify dashboard |
| `SESSION_SECRET` | long random string (see below) |
| `VITE_PARTYKIT_HOST` | Cloudflare Worker host, **no** `https://` (after step 4) |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`VITE_*` vars are baked in at **build** time — redeploy after changing them.

### 3. Spotify redirect URI
```
https://your-app.vercel.app/api/callback
```

### 4. Multiplayer Worker (Cloudflare)
PartyKit’s shared `partykit.dev` domain is full; Guessify deploys the room to **your** Cloudflare account via Wrangler.

```bash
npm install --legacy-peer-deps
set CLOUDFLARE_ACCOUNT_ID=your_account_id
set CLOUDFLARE_API_TOKEN=your_api_token   # Edit Cloudflare Workers template
npm run deploy:party
```

Copy the printed host (e.g. `guessify.guessify-n4kulr.workers.dev`) into Vercel as `VITE_PARTYKIT_HOST`, then redeploy.

---

## Run locally

```bash
npm install --legacy-peer-deps
cp .env.example .env          # Spotify + SESSION_SECRET
npx vercel dev                # frontend + /api (login works)

# second terminal — multiplayer rooms
npm run dev:party             # Wrangler on 127.0.0.1:8787
```

Register `http://localhost:3000/api/callback` (or whatever port `vercel dev` prints) in the Spotify dashboard.

Plain `npm run dev` is frontend-only — no `/api`, so Spotify login won’t work.

Optional in `.env` / Vercel:
```
VITE_PARTYKIT_HOST=127.0.0.1:8787   # local default if unset
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite frontend only |
| `npm run dev:party` | Local multiplayer Worker (`wrangler dev`) |
| `npm run deploy:party` | Deploy multiplayer Worker to Cloudflare |
| `npm run build` | Production frontend build |

---

made with ♥ by nakul
