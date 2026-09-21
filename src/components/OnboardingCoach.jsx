import { useId } from "react";

/**
 * Hand-drawn pencil arrow + label for the first-visit demo.
 * step: "vinyl" | "guess"
 */
export default function OnboardingCoach({ step }) {
  const markerId = useId().replace(/:/g, "");
  if (step !== "vinyl" && step !== "guess") return null;

  const vinyl = step === "vinyl";
  const label = vinyl ? "tap here" : "type the song title…";
  const hint = vinyl ? null : "hint: most streamed song ever";
  // Arrow curves toward the target (vinyl center / title field).
  const path = vinyl
    ? "M18 8 C 28 18, 42 36, 52 58"
    : "M62 8 C 48 22, 34 40, 28 58";

  return (
    <div
      className={`onboard-coach onboard-coach--${step}`}
      aria-hidden="true"
    >
      <div className="onboard-coach-copy">
        <span className="onboard-coach-label">{label}</span>
        {hint && <span className="onboard-coach-hint">{hint}</span>}
      </div>
      <svg
        className="onboard-coach-svg"
        viewBox="0 0 72 68"
        width="72"
        height="68"
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
        <path
          className="onboard-coach-stroke"
          d={path}
          strokeWidth="2.4"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </svg>
    </div>
  );
}
