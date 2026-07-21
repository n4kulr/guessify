# 🎧 Guessify

A playful, record-shop-themed music guessing game. Log in with Spotify, pick one of
your playlists, and guess songs from short spinning-vinyl snippets — Heardle style. The
less you hear before you guess, the more points you score.

## How it works

- **Frontend:** React + Vite (`client/`) — the turntable UI, game logic, guessing.
- **Backend:** Express (`server/`) — handles Spotify OAuth login and proxies playlist
  data so your Client Secret never touches the browser.

Snippets use Spotify's 30-second `preview_url`. Spotify doesn't provide a preview for
every track, so the game automatically plays only the tracks that have one.

## Setup

### 1. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an app.
3. In the app's settings, add this **Redirect URI** exactly:
   ```
   http://127.0.0.1:8888/api/callback
   ```
   > Spotify no longer allows `localhost` — you must use `127.0.0.1`.
4. Copy the **Client ID** and **Client Secret**.

### 2. Configure the backend

```bash
cd server
cp .env.example .env      # then edit .env with your Client ID/Secret
npm install
npm run dev
```

### 3. Run the frontend

```bash
cd client
npm install
npm run dev
```

### 4. Play

Open **http://127.0.0.1:5173** (use `127.0.0.1`, not `localhost`, so the login cookie
matches), click **Log in with Spotify**, and pick a playlist.

## Scoring

Each round gives you 6 guesses. You start with a 1-second snippet; every wrong guess or
skip unlocks more audio (1 → 2 → 4 → 7 → 11 → 16s). Guessing on your first try is worth
6 points, down to 1 point on your last.
