# Guessify

A record-shop-styled music guessing game. Hear a short snippet, name the track, skip for more audio if you’re stuck. Five rounds per game. Audio comes from free **iTunes** (then **Deezer**) preview MP3s — no Spotify Premium, no Web Playback SDK.

**Live:** [guessify.uk](https://guessify.uk)

---

## The game

Each game is **5 records**. For every round you get a clipped preview that starts short and grows when you skip:

**2 → 4 → 7 → 11 → 16 → 20** seconds

Type the **song title** to win the round. Guessing the **artist** first is a smaller bonus. Wrong titles don’t burn audio — only **skip** unlocks more of the track. After enough skips you can take a **title hint** (masked letters in the input placeholder).

Skip and hint don’t touch points you’ve already banked. They **cut this round’s title payout** instead, so early guesses pay more.

When the round ends you hear the full preview, see the cover, and move on (solo advances yourself; races vote to advance together).

---

## Ways to play

### Solo
- Pick **Liked Songs**, a playlist you own (Spotify login), or a **chart / vibe** (Last.fm tags — works logged out too).
- Logged-out visitors can also browse the site owner’s shared playlists when that’s configured.
- Your score is local. **Play again** rematches the same playlist; or pick another from the picker.
- If a track has no preview, Guessify silently swaps in a spare from the pool and keeps the same round.

### Host a party
- Host picks the playlist/chart, gets a **6-character room code + QR** (`/join/CODE`).
- Friends join from their phones with a **nickname only** — no Spotify required.
- Everyone customizes an **Open Peeps** avatar and accent color.
- **Each device plays its own audio** (no shared DJ). Skip unlocks more audio for you only.
- First correct **title** wins the round. Everyone votes before the next song.
- Powered by a Cloudflare Worker + Durable Objects (PartyServer).

### Play online
- Instant race on a random Last.fm chart pack (pop, hip-hop, R&B, decades, etc.).
- Same guess / skip / hint / vote loop as a party, with a live-looking player rail.
- Matchmaking runs in the browser (no room code); opponents are local stand-ins so you can always race.

### Join with a code
- Home screen **“Got a party code?”** or open `/join/CODE`.
- Pick nickname + look → drop into the host’s lobby.

---

## Features

### Guessing
- Separate **title** and **artist** fields.
- Fuzzy matching (normalized punctuation, feat./remaster stripping, short typos allowed).
- Unlimited wrong guesses; only skip grows the snippet.
- Correct artist first → field locks and reveals for everyone in a race; title still pays.

### Skip & hint
- **Skip** → more audio; red **−40** pops above the button (cuts this round’s title).
- **Hint** (after 4 skips, at the 16s step) → masked placeholder like `d▢▢s▢e▢`; the hint label swaps to a red **−100** flash and stays gone for the round.
- Both shake the board when the cut applies.

### Vinyl & audio
- Scrubbable vinyl: play / pause, drag to scrub (scratch SFX).
- Master **volume** in the top bar (persisted; right-click mute).
- Previews resolved at play time: track + artist → iTunes Search → Deezer fallback.

### Look & feel
- Monkeytype-inspired **themes** (default Olivia); accent colors can retint the UI.
- 105 **Open Peeps** bust avatars for races.
- First-run **howto**; `?` FAB anytime.
- **Feedback** FAB → Discord (optional screenshots).
- Share score at the end (native share or copy).
- Keyboard click SFX; confetti on wins.

### Music sources
| Source | What you get |
| --- | --- |
| **Spotify** | Your Liked Songs + owned playlists + cover art (login) |
| **Charts & vibes** | Last.fm genre / decade / custom tags → track lists |
| **Previews** | iTunes → Deezer MP3s (no Spotify streaming) |

---

## Scoring

| Action | Points |
| --- | --- |
| Title (base) | **+500** |
| Artist (first claim) | **+100** |
| Skip | **−40** from this round’s title each |
| Title hint | **−100** from this round’s title once |

**Payout:** `max(0, 500 − skips×40 − (hint ? 100 : 0))` for the title, plus artist if you claimed it.

| Example | Score that round |
| --- | --- |
| Title + artist, no helps | **600** |
| 1 skip + title + artist | **560** |
| 2 skips + title | **420** |
| 4 skips + title | **340** |
| 4 skips + hint + title | **240** |
| Artist first, then 4 skips + hint + title | **340** |

Perfect game (5 clean rounds): **3000**. Excellent sits around 2600–2900; casual play often lands 1500–2100.

### End-of-game stats
After a solo, online, or party game you get:
- **Score / accuracy / avg solve / artists / fastest / best streak** (solve times are wall-clock from round start → correct title)
- **Personal bests** per playlist or chart (all-time + today), stored in the browser
- **Solved after** distribution and a **replay timeline** for each round

---

## How it’s made

| Layer | Stack | Role |
| --- | --- | --- |
| **UI** | React 18 + Vite | Landing, picker, solo, party, online |
| **Auth & library** | Vercel serverless (`api/`) | Spotify OAuth, session cookie, playlists, Liked Songs, covers |
| **Charts** | Last.fm `tag.getTopTracks` | Genre / decade / custom tags |
| **Playback** | iTunes → Deezer + HTML `<audio>` | Free ~30s preview MP3s |
| **Realtime rooms** | Cloudflare Workers + [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver) + Durable Objects | Authoritative party state |
| **Client sockets** | [PartySocket](https://www.npmjs.com/package/partysocket) | Browser ↔ Worker |

### Repo map

```
api/                 Spotify OAuth + playlist/liked proxies + iTunes preview + Last.fm charts
party/               Multiplayer Worker (room.js + worker entry)
public/peeps/        Open Peeps bust avatars
src/
  components/        Solo UI, online race, picker, feedback, …
  multiplayer/       Host/guest apps, avatars, PartySocket hook, constants
  match.js           Fuzzy title/artist matching
  itunes.js          Preview URL cache → /api/preview
  titleHint.js       Late-game title mask
  usePreviewPlayer.js
wrangler.jsonc       Cloudflare Worker config
```

Session: encrypted **http-only cookie** (no DB). Spotify Client Secret stays on the server. Spotify is only for **library + covers**; snippets resolve at play time via iTunes/Deezer.

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
| `LASTFM_API_KEY` | [Last.fm API account](https://www.last.fm/api/account/create) (Charts & vibes) |
| `VITE_PARTYKIT_HOST` | Cloudflare Worker host, **no** `https://` (after step 4) |
| `OWNER_REFRESH_TOKEN` | optional — shows your playlists to logged-out visitors |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`VITE_*` vars are baked in at **build** time — redeploy after changing them.

**Shared playlists for logged-out visitors (optional):** visit `/api/login?owner=1` on your deployed site and log in with your own Spotify account. The callback prints a refresh token instead of starting a session — copy it into `OWNER_REFRESH_TOKEN` in Vercel and redeploy.

### 3. Custom domain + Spotify redirect URI

Point `guessify.uk` at the Vercel project. Then set:

| Name | Value |
| --- | --- |
| `APP_BASE_URL` | `https://guessify.uk` |

Spotify redirect URI:
```
https://guessify.uk/api/callback
```

Keep the old `*.vercel.app` redirect URI too if you still use preview/prod aliases.

### 4. Multiplayer Worker (Cloudflare)

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
