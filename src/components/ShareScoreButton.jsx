import { useState } from "react";
import { renderShareCard, scoreSharePayload } from "../shareScore.js";
import SharePreviewDialog from "./SharePreviewDialog.jsx";

/** Game-over CTA — previews the Wrapped-style PNG, then shares it. */
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
  const [open, setOpen] = useState(false);

  const opts = {
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
  };

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        share score
      </button>
      {open && (
        <SharePreviewDialog
          heading="share your score"
          render={() => renderShareCard(opts)}
          text={scoreSharePayload(opts).text}
          filename="guessify-wrap.png"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
