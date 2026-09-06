import { useRef, useState } from "react";
import { shareScore } from "../shareScore.js";

/** Game-over CTA — shares a Wrapped-style PNG when possible. */
export default function ShareScoreButton({
  mode,
  score,
  maxScore,
  place,
  name,
  stats = null,
  playlistName = "",
  className = "btn btn-big btn-multi",
}) {
  const [label, setLabel] = useState("share score");
  const timer = useRef(0);

  async function onClick() {
    const result = await shareScore({
      mode,
      score,
      maxScore,
      place,
      name,
      playlistName,
      accuracy: stats?.accuracy,
      fastestMs: stats?.fastestMs,
      bestStreak: stats?.bestStreak,
      artistsClaimed: stats?.artistsClaimed,
      artistsTotal: stats?.artistsTotal,
      timeline:
        mode === "solo"
          ? stats?.timeline
          : stats?.timelineWins || stats?.timeline,
    });
    if (result === "cancelled") return;
    clearTimeout(timer.current);
    const next =
      result === "shared"
        ? "shared!"
        : result === "downloaded"
          ? "saved image!"
          : "copied!";
    setLabel(next);
    timer.current = window.setTimeout(() => setLabel("share score"), 1800);
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
