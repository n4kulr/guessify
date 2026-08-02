/** Brief “Very close…” flash inside a guess field. `token` remounts the animation. */
export default function AlmostFlash({ token, onDone }) {
  if (!token) return null;
  return (
    <span
      key={token}
      className="guess-almost"
      onAnimationEnd={onDone}
      aria-live="polite"
    >
      Very close…
    </span>
  );
}
