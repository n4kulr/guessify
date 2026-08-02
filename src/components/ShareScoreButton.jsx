import { useRef, useState } from "react";
import { shareScore } from "../shareScore.js";

/** Game-over CTA — prefers navigator.share, else copies the score blurb. */
export default function ShareScoreButton({
  mode,
  score,
  maxScore,
  place,
  name,
  className = "btn btn-big btn-multi",
}) {
  const [label, setLabel] = useState("share score");
  const timer = useRef(0);

  async function onClick() {
    const result = await shareScore({ mode, score, maxScore, place, name });
    if (result === "cancelled") return;
    clearTimeout(timer.current);
    setLabel(result === "shared" ? "shared!" : "copied!");
    timer.current = window.setTimeout(() => setLabel("share score"), 1600);
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
