// Short cassette-deck blips (Web Audio, no assets).

let ctx = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function resume() {
  const c = ensure();
  if (c?.state === "suspended") c.resume().catch(() => {});
  return c;
}

function tone({ freq, dur = 0.08, type = "square", gain = 0.08, slideTo }) {
  const c = resume();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
  }
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function noiseBurst({ dur = 0.06, gain = 0.05, freq = 1200 }) {
  const c = resume();
  if (!c) return;
  const now = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(now);
  src.stop(now + dur);
}

/** 0 rewind · 1 play · 2 pause · 3 ff */
export function playCassetteButton(i) {
  switch (i) {
    case 0: // rewind — descending whir
      tone({ freq: 420, slideTo: 180, dur: 0.22, type: "sawtooth", gain: 0.05 });
      noiseBurst({ dur: 0.12, gain: 0.03, freq: 900 });
      break;
    case 1: // play — soft clack + gentle start
      noiseBurst({ dur: 0.04, gain: 0.06, freq: 1800 });
      tone({ freq: 220, slideTo: 280, dur: 0.14, type: "triangle", gain: 0.06 });
      break;
    case 2: // pause — muted dual click
      tone({ freq: 160, dur: 0.05, type: "square", gain: 0.045 });
      setTimeout(() => tone({ freq: 140, dur: 0.04, type: "square", gain: 0.03 }), 45);
      break;
    case 3: // ff — ascending whir
      tone({ freq: 200, slideTo: 520, dur: 0.22, type: "sawtooth", gain: 0.05 });
      noiseBurst({ dur: 0.12, gain: 0.03, freq: 1400 });
      break;
    default:
      noiseBurst({ dur: 0.05, gain: 0.04, freq: 1000 });
  }
}
