/**
 * Hand-drawn curved arrow + label for landing-page affordances.
 * variant: "drag" (points at vinyl) | "press" (points up at cassette teeth)
 */
export default function CurvedNudge({ variant = "drag", label }) {
  const text = label || (variant === "press" ? "press me" : "drag me");

  if (variant === "press") {
    return (
      <div className="nudge nudge--press" aria-hidden="true">
        <span className="nudge-label">{text}</span>
        <svg
          className="nudge-svg"
          viewBox="0 0 100 130"
          width="100"
          height="130"
          fill="none"
        >
          {/* starts at bottom, curves up toward cassette buttons */}
          <path
            className="nudge-stroke"
            d="M62 122 C 18 110, 6 70, 22 42 C 34 22, 58 16, 74 28"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            className="nudge-stroke"
            d="M62 22 L74 28 L66 40"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="nudge nudge--drag" aria-hidden="true">
      <svg
        className="nudge-svg"
        viewBox="0 0 120 90"
        width="120"
        height="90"
        fill="none"
      >
        <path
          className="nudge-stroke"
          d="M108 58 C 88 88, 42 86, 28 58 C 18 38, 28 18, 48 16"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <path
          className="nudge-stroke"
          d="M38 8 L48 16 L36 24"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="nudge-label">{text}</span>
    </div>
  );
}
