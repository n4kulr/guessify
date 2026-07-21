// Lightweight DJ-style vinyl scratch synthesizer (Web Audio, no asset).
export function createScratchEngine() {
  let ctx = null;
  let source = null;
  let filter = null;
  let gain = null;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    const seconds = 1.5;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Soft noise with a bit of grit — closer to vinyl than pure white noise.
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // gentle brown-ish
      data[i] = (white * 0.55 + last * 0.45) * 0.9;
    }

    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 1.6;

    gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  function setSpeed(radPerMs) {
    ensure();
    if (!ctx || !gain || !filter) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const speed = Math.abs(radPerMs);
    // Map angular speed → loudness + brightness.
    const intensity = Math.min(1, speed * 18);
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(intensity * 0.55, now, 0.03);
    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setTargetAtTime(350 + intensity * 3200, now, 0.04);
    // Slight pitch bend via playbackRate feels more "scratchy".
    try {
      source.playbackRate.setTargetAtTime(0.55 + intensity * 1.4, now, 0.04);
    } catch {
      /* older browsers */
    }
  }

  function stop() {
    if (!ctx || !gain) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.05);
  }

  function dispose() {
    try {
      source?.stop();
    } catch {
      /* already stopped */
    }
    try {
      ctx?.close();
    } catch {
      /* ignore */
    }
    ctx = null;
    source = null;
    filter = null;
    gain = null;
  }

  return { setSpeed, stop, dispose };
}

export function pointerAngle(el, clientX, clientY) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.atan2(clientY - cy, clientX - cx);
}
