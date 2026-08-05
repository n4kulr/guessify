import { useId } from "react";

/**
 * Curved "spin me!" cue on the outside of the in-game vinyl —
 * top-left arc with a gap past the disc edge. Presence fade matches DragMeNudge.
 */
export default function SpinMeNudge() {
  const pathId = useId().replace(/:/g, "");

  return (
    <svg
      className="spin-nudge"
      viewBox="0 0 100 100"
      aria-hidden="true"
      overflow="visible"
    >
      <defs>
        {/*
          Vinyl radius ~43 (md). Path radius 54 for a clear gap.
          Clockwise arc ~200°→255° = top-left (9–12 o'clock).
        */}
        <path
          id={pathId}
          d="M 0.7 31.5 A 54 54 0 0 1 31.5 0.7"
          fill="none"
        />
      </defs>
      <text className="spin-nudge-text">
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          spin me!
        </textPath>
      </text>
    </svg>
  );
}
