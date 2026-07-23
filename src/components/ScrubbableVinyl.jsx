import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createScratchEngine, pointerAngle } from "../vinylScratch.js";

const SCRUB_THRESHOLD = 0.05; // radians before a drag counts as scrubbing

// One shared engine so every disc on screen can scratch without stacking contexts.
let sharedScratch = null;
function getScratch() {
  if (!sharedScratch) sharedScratch = createScratchEngine();
  return sharedScratch;
}

/** Read the element's current visual rotation in degrees (works mid-CSS-animation). */
function getElementRotationDeg(el) {
  if (!el) return 0;
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return 0;
  try {
    const m = new DOMMatrixReadOnly(t);
    return (Math.atan2(m.m12, m.m11) * 180) / Math.PI;
  } catch {
    return 0;
  }
}

/**
 * Any spinning record that can be dragged for a DJ scratch sound.
 * Optional onClick fires on a tap (not a scrub). onScrubStart for host audio ducking.
 * Rotation is preserved when spin stops and continues from that angle when it resumes.
 */
export default function ScrubbableVinyl({
  className = "",
  spin = "fast", // "fast" | "slow" | false
  onClick,
  onScrubStart,
  onScrubEnd,
  enabled = true,
  title,
  children,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const scrubRef = useRef(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [rot, setRot] = useState(0);
  // Keep CSS spin class one frame after `spin` goes false so we can sample the angle.
  const [visualSpin, setVisualSpin] = useState(spin);

  const onClickRef = useRef(onClick);
  const onScrubStartRef = useRef(onScrubStart);
  const onScrubEndRef = useRef(onScrubEnd);
  useEffect(() => {
    onClickRef.current = onClick;
    onScrubStartRef.current = onScrubStart;
    onScrubEndRef.current = onScrubEnd;
  });

  useLayoutEffect(() => {
    if (scrubbing) return;
    if (spin === "fast" || spin === "slow") {
      if (visualSpin !== spin) setVisualSpin(spin);
      return;
    }
    // Stopping: sample while animation class is still applied, then park.
    if (visualSpin) {
      const el = ref.current;
      if (el) setRot(getElementRotationDeg(el));
      setVisualSpin(false);
    }
  }, [spin, scrubbing, visualSpin]);

  function onPointerDown(e) {
    if (!enabled) return;
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    const angle = pointerAngle(el, e.clientX, e.clientY);
    const base =
      visualSpin && !scrubbing ? getElementRotationDeg(el) : rot;
    scrubRef.current = {
      pointerId: e.pointerId,
      startAngle: angle,
      lastAngle: angle,
      lastTime: performance.now(),
      baseRot: base,
      scrubbing: false,
    };
  }

  function onPointerMove(e) {
    const s = scrubRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const el = ref.current;
    if (!el) return;

    const angle = pointerAngle(el, e.clientX, e.clientY);
    let delta = angle - s.lastAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    let total = angle - s.startAngle;
    if (total > Math.PI) total -= Math.PI * 2;
    if (total < -Math.PI) total += Math.PI * 2;

    if (!s.scrubbing && Math.abs(total) > SCRUB_THRESHOLD) {
      // Freeze live CSS spin angle before scrub class removes the animation.
      const live = getElementRotationDeg(el);
      s.baseRot = live;
      s.startAngle = angle;
      s.scrubbing = true;
      setRot(live);
      setScrubbing(true);
      onScrubStartRef.current?.();
    }

    if (s.scrubbing) {
      const now = performance.now();
      const dt = Math.max(1, now - s.lastTime);
      getScratch().setSpeed(delta / dt);
      setRot(s.baseRot + ((angle - s.startAngle) * 180) / Math.PI);
    }

    s.lastAngle = angle;
    s.lastTime = performance.now();
  }

  function endPointer(e) {
    const s = scrubRef.current;
    if (!s || (e && s.pointerId !== e.pointerId)) return;
    scrubRef.current = null;
    getScratch().stop();

    if (s.scrubbing) {
      setScrubbing(false);
      onScrubEndRef.current?.();
      return;
    }
    onClickRef.current?.();
  }

  const activeSpin = scrubbing ? false : visualSpin;
  const spinClass =
    activeSpin === "fast"
      ? "spin-fast"
      : activeSpin === "slow"
      ? "spin-slow"
      : "vinyl--parked";

  return (
    <div
      ref={ref}
      role={onClick ? "button" : undefined}
      tabIndex={enabled && onClick ? 0 : undefined}
      title={title}
      className={`vinyl vinyl--interactive ${className} ${spinClass} ${
        scrubbing ? "vinyl--scrubbing" : ""
      }`}
      style={{
        ...style,
        "--vinyl-rot": `${rot}deg`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
