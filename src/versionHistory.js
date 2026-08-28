export const APP_VERSION = "v1.2.91";

export const CHANGELOG = [
  {
    version: "v1.2.91",
    date: "29/08/26",
    title: "smart nudges & polish",
    items: [
      "guess button pulses if you type something and pause for a bit",
      "next song / see results button blinks if you linger on the reveal card",
      "skip button nudge timer lowered to 15s and works independently from play",
      "capped search autocomplete to 3 items so it doesn't take over your screen",
      "brought back album art in dropdowns and round reveals",
      "fixed mobile audio cutting out or not starting on first tap",
    ],
  },
  {
    version: "v1.2.80",
    date: "24/08/26",
    title: "mashups & picker tour",
    items: [
      "stack your own mix by combining artists, genres, and eras into a mashup",
      "quick tutorial tour through the cd shelf and playlist picker",
      "silent background preloading so next rounds start instantly with zero lag",
      "better artist suggestions ranked by popularity with album covers",
    ],
  },
  {
    version: "v1.2.50",
    date: "05/08/26",
    title: "race modes & themes",
    items: [
      "added classic and timed race modes for multiplayer and online play",
      "live solve times on player chips plus artist bonus points",
      "monkeytype-style theme menu with browser bar color matching",
      "mechanical keyboard clicks while typing and vinyl needle-drop sounds",
      "turntable spinner cue with live record scrubbing",
    ],
  },
  {
    version: "v1.2.0",
    date: "03/08/26",
    title: "share cards & hints",
    items: [
      "spotify wrapped-style shareable scorecards matching your current theme",
      "audio snippets unlock gradually (2s → 4s → 7s → 11s → 16s → 20s)",
      "automatic title hints with box blanks so you're never completely stuck",
      "curated last.fm chart packs and describe-it search",
    ],
  },
  {
    version: "v1.1.50",
    date: "23/07/26",
    title: "party rooms & cd cases",
    items: [
      "real-time qr party rooms on cloudflare workers with open peeps avatars",
      "top-down 3d cd shelf with pull-out tracklist liner paper",
      "interactive retro cassette tape live demo on the landing page",
      "switched to free itunes and deezer previews so no spotify premium needed",
    ],
  },
  {
    version: "v1.0.0",
    date: "22/07/26",
    title: "initial release",
    items: [
      "type song title or artist to guess the track",
      "vinyl playback, point scoring, and spotify playlist shelf",
    ],
  },
];
