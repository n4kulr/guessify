# 🎧 Guessify

A playful, record-shop-themed music guessing game. Log in with Spotify, pick one of
your playlists, and guess songs from short spinning-vinyl snippets — Heardle style. The
less you hear before you guess, the more points you score.

## How it works

- **Frontend:** React + Vite at the repo root — the turntable UI, game logic, guessing.
- **Backend:** Serverless functions in `api/` — handle Spotify OAuth login and proxy
  playlist data so your Client Secret never touches the browser. Login state lives in an
  encrypted, http-only cookie (no server-side session store), so it runs on Vercel.

Snippets use Spotify's 30-second `preview_url`. Spotify doesn't provide a preview for
every track, so the game automatically plays only the tracks that have one.

## Deploy to Vercel

### 1. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and
   create an app.
2. Copy the **Client ID** and **Client Secret**.
3. Leave the Redirect URI for step 3 (you need your Vercel URL first).

### 2. Import the repo into Vercel

Push this repo to GitHub and import it in Vercel. It's zero-config — Vercel detects the
Vite frontend and the `api/` functions automatically. In the project's
**Settings → Environment Variables**, add:

| Name | Value |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | from the Spotify dashboard |
| `SPOTIFY_CLIENT_SECRET` | from the Spotify dashboard |
| `SESSION_SECRET` | any long random string (see below) |

Generate a `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then **redeploy** so the env vars take effect.

### 3. Register the Redirect URI

Once deployed you'll have a URL like `https://your-app.vercel.app`. Back in the Spotify
dashboard, add this **exact** Redirect URI:

```
https://your-app.vercel.app/api/callback
```

(If you add a custom domain later, register that one too.)

### 4. Play

Open your Vercel URL, click **Log in with Spotify**, and pick a playlist.

## Run locally

Local dev needs the Vercel CLI so the `api/` functions run alongside the frontend:

```bash
npm install
npm i -g vercel

cp .env.example .env        # fill in your Spotify creds + a SESSION_SECRET
vercel dev                  # serves frontend + /api on one port
```

For local login, also register `http://localhost:3000/api/callback` (the port
`vercel dev` prints) as a Redirect URI in the Spotify dashboard.

> Plain `npm run dev` runs only the frontend (no `/api`), so login won't work with it.

## Scoring

Each round gives you 6 guesses. You start with a 1-second snippet; every wrong guess or
skip unlocks more audio (1 → 2 → 4 → 7 → 11 → 16s). Guessing on your first try is worth
6 points, down to 1 point on your last. Nailing the artist too adds a +1 bonus.

## Multiplayer

Host (Spotify login) creates a party, shows a QR, and DJs audio on their device. Friends
scan the QR, pick a nickname (no Spotify), and race on their phones — first correct title
wins the round.

Realtime rooms use [PartyKit](https://www.partykit.io/).

### Local

```bash
# terminal 1 — Spotify API + Vite (or vercel dev)
npm run dev

# terminal 2 — PartyKit room server
npm run dev:party
```

`VITE_PARTYKIT_HOST` defaults to `127.0.0.1:1999` for local PartyKit.

### Production

```bash
npx partykit login
npm run deploy:party
```

Then set in Vercel (and rebuild):

| Name | Value |
| --- | --- |
| `VITE_PARTYKIT_HOST` | your PartyKit host, e.g. `guessify.<you>.partykit.dev` |

