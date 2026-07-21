import { useEffect, useId, useState } from "react";

const FIRST_DELAY_MS = 2000;
const REPEAT_MS = 60_000;
const VISIBLE_MS = 5000;

/** Occasional cue pointing at the theme switcher. */
export default function ThemeNudge() {
  const markerId = useId().replace(/:/g, "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer;
    let interval;
    const timers = [];

    function show() {
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
      timers.push(hideTimer);
    }

    const first = setTimeout(() => {
      show();
      interval = setInterval(show, REPEAT_MS);
    }, FIRST_DELAY_MS);
    timers.push(first);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`theme-nudge${visible ? " theme-nudge--on" : ""}`}
      aria-hidden="true"
    >
      <svg
        className="theme-nudge-svg"
        viewBox="0 0 72 56"
        width="72"
        height="56"
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
              className="theme-nudge-stroke"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        <path
          className="theme-nudge-stroke"
          d="M18 48 C 22 28, 38 14, 58 10"
          strokeWidth="2.5"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </svg>
    </div>
  );
}
