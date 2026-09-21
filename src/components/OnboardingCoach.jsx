import { useId } from "react";

/** Pencil arrow from the left of the vinyl — label sits above the stroke. */
export default function OnboardingCoach() {
  const markerId = useId().replace(/:/g, "");

  return (
    <div className="onboard-coach onboard-coach--vinyl" aria-hidden="true">
      <span className="onboard-coach-label">tap here</span>
      <svg
        className="onboard-coach-svg"
        viewBox="0 0 88 36"
        width="88"
        height="36"
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
              className="onboard-coach-stroke"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        {/* Left → right into the vinyl */}
        <path
          className="onboard-coach-stroke"
          d="M8 18 C 28 10, 52 10, 78 18"
          strokeWidth="2.4"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </svg>
    </div>
  );
}
