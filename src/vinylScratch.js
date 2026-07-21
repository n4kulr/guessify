// DJ vinyl scrub synthesizer (Web Audio, no assets).
// Direction-aware pitch, snappy attack, vinyl grit + tonal "wick".

export function createScratchEngine() {
  let ctx = null;
  let noiseSrc = null;
  let toneOsc = null;
  let noiseFilter = null;
  let toneFilter = null;
  let noiseGain = null;
  let toneGain = null;
  let master = null;
  let lastDir = 0;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    // Looping vinyl-ish noise (pink-ish + light crackle).
    const seconds = 2;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      const sample = b0 + b1 + b2 + white * 0.15;
      data[i] = Math.max(-1, Math.min(1, sample * 0.35));
    }

    noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;
    noiseSrc.loop = true;

    noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 2.4;

    const noiseBright = ctx.createBiquadFilter();
    noiseBright.type = "highpass";
    noiseBright.frequency.value = 280;

    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    toneOsc = ctx.createOscillator();
    toneOsc.type = "sawtooth";
    toneOsc.frequency.value = 190;

    toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "bandpass";
    toneFilter.frequency.value = 900;
    toneFilter.Q.value = 6;

    toneGain = ctx.createGain();
    toneGain.gain.value = 0;

    master = ctx.createGain();
    master.gain.value = 0.85;

    noiseSrc.connect(noiseBright);
    noiseBright.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    toneOsc.connect(toneFilter);
    toneFilter.connect(toneGain);
    toneGain.connect(master);

    master.connect(ctx.destination);

    noiseSrc.start();
    toneOsc.start();
  }

  function setSpeed(radPerMs) {
    ensure();
    if (!ctx || !master) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const signed = radPerMs;
    const speed = Math.abs(signed);
    // Snappier response — small flicks still speak.
    const intensity = Math.min(1, Math.pow(speed * 28, 0.85));
    const newDir = signed === 0 ? lastDir || 1 : Math.sign(signed);
    if (signed !== 0) lastDir = newDir;

    const now = ctx.currentTime;
    const lag = 0.018; // tight scrub follow

    // Noise body (the vinyl surface)
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setTargetAtTime(intensity * 0.72, now, lag);

    noiseFilter.frequency.cancelScheduledValues(now);
    noiseFilter.frequency.setTargetAtTime(700 + intensity * 3800, now, lag);
    noiseFilter.Q.cancelScheduledValues(now);
    noiseFilter.Q.setTargetAtTime(1.6 + intensity * 3.2, now, lag);

    // Tonal "wick / baby" layer — pitch follows scrub intensity
    const baseHz = 140 + intensity * 420;
    toneOsc.frequency.cancelScheduledValues(now);
    toneOsc.frequency.setTargetAtTime(baseHz, now, lag);

    toneFilter.frequency.cancelScheduledValues(now);
    toneFilter.frequency.setTargetAtTime(500 + intensity * 2400, now, lag);

    toneGain.gain.cancelScheduledValues(now);
    toneGain.gain.setTargetAtTime(intensity * 0.12, now, lag * 1.4);

    // Playback rate: reverse when scrubbing the other way (classic DJ feel)
    const rate = newDir * (0.28 + intensity * 2.35);
    try {
      noiseSrc.playbackRate.cancelScheduledValues(now);
      noiseSrc.playbackRate.setTargetAtTime(rate, now, lag);
    } catch {
      try {
        noiseSrc.playbackRate.setTargetAtTime(Math.abs(rate), now, lag);
      } catch {
        /* older browsers */
      }
    }
  }

  function stop() {
    if (!ctx || !noiseGain || !toneGain) return;
    const now = ctx.currentTime;
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setTargetAtTime(0, now, 0.04);
    toneGain.gain.cancelScheduledValues(now);
    toneGain.gain.setTargetAtTime(0, now, 0.04);
  }

  function dispose() {
    try {
      noiseSrc?.stop();
    } catch {
      /* already stopped */
    }
    try {
      toneOsc?.stop();
    } catch {
      /* already stopped */
    }
    try {
      ctx?.close();
    } catch {
      /* ignore */
    }
    ctx = null;
    noiseSrc = null;
    toneOsc = null;
    noiseFilter = null;
    toneFilter = null;
    noiseGain = null;
    toneGain = null;
    master = null;
    lastDir = 0;
  }

  return { setSpeed, stop, dispose };
}

export function pointerAngle(el, clientX, clientY) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.atan2(clientY - cy, clientX - cx);
}

/** Soft one-shot needle-drop scratch (~300ms). Separate from the scrub engine. */
export function playNeedleDrop() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const c = new AC();
  if (c.state === "suspended") c.resume().catch(() => {});

  const now = c.currentTime;
  const dur = 0.32;
  const len = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.08;
    b1 = 0.985 * b1 + white * 0.11;
    const env = Math.sin((i / len) * Math.PI) * (1 - i / len * 0.35);
    data[i] = Math.max(-1, Math.min(1, (b0 + b1 + white * 0.2) * 0.45 * env));
  }

  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 0.85;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(2200, now + 0.12);
  filter.frequency.exponentialRampToValueAtTime(700, now + dur);
  filter.Q.value = 1.8;

  const tone = c.createOscillator();
  tone.type = "sawtooth";
  tone.frequency.setValueAtTime(160, now);
  tone.frequency.exponentialRampToValueAtTime(90, now + dur);

  const toneFilter = c.createBiquadFilter();
  toneFilter.type = "bandpass";
  toneFilter.frequency.value = 600;
  toneFilter.Q.value = 4;

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  const toneGain = c.createGain();
  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.exponentialRampToValueAtTime(0.04, now + 0.015);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.85);

  const master = c.createGain();
  master.gain.value = 0.55;

  src.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);

  tone.connect(toneFilter);
  toneFilter.connect(toneGain);
  toneGain.connect(master);

  master.connect(c.destination);

  src.start(now);
  tone.start(now);
  src.stop(now + dur);
  tone.stop(now + dur + 0.02);

  const closeAt = (dur + 0.08) * 1000;
  setTimeout(() => {
    try {
      c.close();
    } catch {
      /* ignore */
    }
  }, closeAt);
}
