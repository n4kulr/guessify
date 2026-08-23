const TONES = [
  "clear", "white", "black", "grey", "smoke", "amber", "slate", "frost",
  "blue", "purple", "yellowed",
];
const FONTS = ["", "hand", "serif", "mono", "thin", "condensed"];
const HISTORIES = [
  ["new"],
  ["used"],
  ["faded"],
  ["used", "cracked"],
  ["faded", "cracked"],
  ["used", "sticker"],
  ["new"],
  ["used"],
  ["faded"],
  ["cracked"],
];
const WIDTHS = [0.88, 0.94, 1, 1.06, 1.12];
const TILTS = [-0.4, 0, 0, 0.3, 0.5];
const DEPTHS = [0, 0, 1, -1, 0];
const STICKERS = [
  null,
  { kind: "round", text: "★", cls: "star", x: "18%", y: "14%", rot: 8 },
  { kind: "price", text: "$4.99", x: "14%", y: "70%", rot: 6 },
  { kind: "square", text: "MIX", x: "18%", y: "16%", rot: -4 },
  { kind: "lib", text: "LIVE", x: "12%", y: "78%", rot: 2 },
  { kind: "round", text: "♥", cls: "heart", x: "28%", y: "20%", rot: -10 },
  { kind: "square", text: "NEW", x: "20%", y: "10%", rot: 3 },
  { kind: "square", text: "2008", x: "10%", y: "58%", rot: -11, peel: true },
  null,
];
const BURNED = ["July 2008", "Summer 2009", "Mar 2011", "Aug 2005", "Winter 2010"];
const RUNTIME = ["1:58:42", "2:04:11", "1:45:02", "2:11:00", "1:28:15"];
const TRACK_N = [28, 32, 34, 36, 40];

export function spineMeta(i) {
  return {
    tone: TONES[i % TONES.length],
    font: FONTS[i % FONTS.length],
    history: HISTORIES[i % HISTORIES.length],
    wScale: WIDTHS[i % WIDTHS.length],
    tilt: TILTS[i % TILTS.length],
    depth: DEPTHS[i % DEPTHS.length],
    sticker: STICKERS[i % STICKERS.length],
    burned: BURNED[i % BURNED.length],
    tracks: TRACK_N[i % TRACK_N.length],
    runtime: RUNTIME[i % RUNTIME.length],
  };
}
