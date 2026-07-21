import { useEffect, useRef, useState } from "react";
import { createScratchEngine, pointerAngle } from "../vinylScratch.js";

const SCRUB_THRESHOLD = 0.08; // radians before a drag counts as scrubbing

// One shared engine so every disc on screen can scratch without stacking contexts.
let sharedScratch = null;
function getScratch() {
  if (!sharedScratch) sharedScratch = createScratchEngine();
  return sharedScratch;
}

/**
 * Any spinning record that can be dragged for a DJ scratch sound.
 * Optional onClick fires on a tap (not a scrub). onScrubStart for host audio ducking.
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

  const onClickRef = useRef(onClick);
  const onScrubStartRef = useRef(onScrubStart);
  const onScrubEndRef = useRef(onScrubEnd);
  useEffect(() => {
    onClickRef.current = onClick;
    onScrubStartRef.current = onScrubStart;
    onScrubEndRef.current = onScrubEnd;
  });

  function onPointerDown(e) {
    if (!enabled) return;
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    const angle = pointerAngle(el, e.clientX, e.clientY);
    scrubRef.current = {
      pointerId: e.pointerId,
      startAngle: angle,
      lastAngle: angle,
      lastTime: performance.now(),
      baseRot: rot,
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
      s.scrubbing = true;
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

  const spinClass =
    !scrubbing && spin === "fast"
      ? "spin-fast"
      : !scrubbing && spin === "slow"
      ? "spin-slow"
      : "";

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
        ...(scrubbing ? { "--vinyl-rot": `${rot}deg` } : null),
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
