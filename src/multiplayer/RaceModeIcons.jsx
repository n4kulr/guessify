/** Themed race-mode glyphs — fill/stroke via currentColor. */

export function ClassicModeIcon({ size = 22 }) {
  return (
    <svg
      className="race-mode-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M9 3v12.26A4 4 0 1 0 11 19V8h6V3H9zm-2 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
      />
    </svg>
  );
}

export function TimedModeIcon({ size = 22 }) {
  return (
    <svg
      className="race-mode-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.75-12.5h-1.5v5.25l4.5 2.7.75-1.23-3.75-2.22z"
      />
    </svg>
  );
}

export function FrenzyModeIcon({ size = 22 }) {
  return (
    <svg
      className="race-mode-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path fill="currentColor" d="M13.5 2 4 13.5h6.5L9 22l10-12.5h-6.6L13.5 2z" />
    </svg>
  );
}
