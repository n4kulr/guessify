# Guessify

A record-shop-styled music guessing game. Log in with Spotify to load your playlists (or Liked Songs), then name the track from short snippets that grow longer as you miss. Audio comes from free **iTunes** (then **Deezer**) preview MP3s — no Spotify Premium, no Web Playback SDK.

Play solo, or **host a game** so friends can join from their phones (nickname only, no Spotify) and race for the first correct title.

**Live:** [guessify.uk](https://guessify.uk)

---

## What you can do

### Solo
- Log in with Spotify (any account)
- Pick **Liked Songs** or a playlist you own (others’ playlists show locked)
- Hear unlocking snippets (1 → 2 → 4 → 7 → 11 → 16 seconds) from iTunes previews
- Type **title** and **artist** (fuzzy match); correct title wins the round
- Correct artist adds a bonus
- Scrub / play / pause on the vinyl; skip unlocks more audio

### Multiplayer
- Host logs in with Spotify, picks a playlist, shares a **QR + room code**
- Guests open `/join/CODE` or type the code on the home screen — no Spotify
- Everyone picks a nickname, peep avatar (Open Peeps), and accent color
- **Each player plays the snippet on their own device** (no shared DJ)
- Skip unlocks more audio on your device only; first correct title wins the round

---

## How it’s made

| Layer | Stack | Role |
| --- | --- | --- |
| **UI** | React 18 + Vite | Landing, playlist picker, solo game, multiplayer lobby / race |
| **Auth & library** | Vercel serverless (`api/`) | Spotify OAuth, session cookie, playlists, Liked Songs, track metadata / cover art |
| **Charts & vibes** | Last.fm `tag.getTopTracks` | Genre / decade / custom tags → track lists (audio still via iTunes) |
| **Playback** | iTunes → Deezer + HTML `<audio>` | Free 30s preview MP3s (no API key) |
| **Realtime rooms** | Cloudflare Workers + [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver) + Durable Objects | Authoritative multiplayer state, guesses, first-correct wins |
| **Client sockets** | [PartySocket](https://www.npmjs.com/package/partysocket) | Browser ↔ Worker WebSocket |

### Repo map

```
api/                 Spotify OAuth + playlist/liked proxies + iTunes preview + Last.fm charts
party/               Multiplayer Worker (room.js + worker entry)
public/peeps/        Open Peeps bust avatars for multiplayer
src/
  components/        Solo UI (Home, Game, PlaylistPicker, DemoPreview, …)
  multiplayer/       Host/guest apps, avatars, PartySocket hook
  match.js           Fuzzy title/artist matching
  itunes.js          Preview URL cache → /api/preview
  usePreviewPlayer.js
wrangler.jsonc       Cloudflare Worker config (Durable Object + SQLite migration)
```

Session: encrypted **http-only cookie** (no DB). Spotify Client Secret stays on the server. Spotify is only used for **your library + cover art**; snippets are resolved at play time via iTunes, with Deezer as fallback.

Avatars: 105 Open Peeps busts in `public/peeps/` (from Flat Assets); lobby is nickname + randomize + accent.

---

## Scoring

Skip unlocks more of the snippet (solo / your device in party): **1 → 2 → 4 → 7 → 11 → 16** seconds.

| What you get right | Points |
| --- | --- |
| Title first (artist not yet claimed) | **500** |
| Artist first | **200** |
| Title after artist was already claimed | **200** |

Title + artist in one guess (artist not yet claimed) → **700**. Max per round → **700**.

---

## Deploy

### 1. Spotify app (library only)
1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → create an app  
2. Copy **Client ID** and **Client Secret**  
3. Add redirect URI after you have a Vercel URL (step 3)  

You do **not** need Spotify Premium, Web Playback, or streaming scopes — just playlist/library read.

### 2. Vercel (site + API)
Import the GitHub repo. Add env vars:

| Name | Value |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | Spotify dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify dashboard |
| `SESSION_SECRET` | long random string (see below) |
| `LASTFM_API_KEY` | [Last.fm API account](https://www.last.fm/api/account/create) (Charts & vibes tab) |
| `VITE_PARTYKIT_HOST` | Cloudflare Worker host, **no** `https://` (after step 4) |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`VITE_*` vars are baked in at **build** time — redeploy after changing them.

### 3. Custom domain + Spotify redirect URI

Point `guessify.uk` at the Vercel project (Cloudflare DNS → Vercel, or Vercel Domains). Then set:

| Name | Value |
| --- | --- |
| `APP_BASE_URL` | `https://guessify.uk` |

Spotify redirect URI:
```
https://guessify.uk/api/callback
```

Keep the old `*.vercel.app` redirect URI too if you still use preview/prod aliases.

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

After pulling this playback change, **log out and log back in** once so Spotify re-issues a token without the old streaming scopes.

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
