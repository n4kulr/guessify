import { useId } from "react";

/** "drag me" cue for the landing vinyl — arrowhead auto-aligns to the curve. */
export default function DragMeNudge() {
  const markerId = useId().replace(/:/g, "");

  return (
    <div className="drag-nudge" aria-hidden="true">
      <span className="drag-nudge-label">drag me</span>
      <svg
        className="drag-nudge-svg"
        viewBox="0 0 88 64"
        width="88"
        height="64"
        fill="none"
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="7"
            markerHeight="7"
            refX="5.5"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0 0.5 L6 3.5 L0 6.5"
              className="drag-nudge-stroke"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        <path
          className="drag-nudge-stroke"
          d="M70 12 C 48 12, 26 22, 14 42"
          strokeWidth="2.5"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </svg>
    </div>
  );
}
