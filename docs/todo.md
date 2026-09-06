# Guessify — TODO

## Done this pass (7 Sep 2026)

- Cueing: `/api/preview` aborts at 12s; cue effects always `setCueReady(true)` on cleanup; 12s failsafe unlocks skip.
- `npm test` runs every `src/*.check.js`; PR CI in `.github/workflows/ci.yml`.
- Dropped unused Three.js, MediaModeToggle, extra `shuffle()` copies, fake “N active” count.
- gitignore `graphify-out/`, `.claude/`, `previews/`. `.env.example` is not ignored.
- Party host reclaim requires the host player UUID; `setPreview` is host-only.
- README hint/scoring/owner-token copy matches the game (hint is free).
- Howto + title placeholder: close spelling, type or pick.

## Later

Extract a shared GuessForm used by all four game shells. Wait until the four screens stay stable — they still differ on vote/next/lock-in.
