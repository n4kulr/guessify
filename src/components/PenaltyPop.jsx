/** Floating −pts flash (skip / hint). `token` remounts the animation. */
export default function PenaltyPop({ token, pts, className = "", onDone }) {
  if (!token) return null;
  return (
    <span
      key={token}
      className={`penalty-pop${className ? ` ${className}` : ""}`}
      onAnimationEnd={onDone}
      aria-hidden="true"
    >
      −{pts}
    </span>
  );
}
