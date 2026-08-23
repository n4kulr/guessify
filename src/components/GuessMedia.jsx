import ScrubbableVinyl from "./ScrubbableVinyl.jsx";
import CassetteShell from "./CassetteShell.jsx";
import SpinMeNudge from "./SpinMeNudge.jsx";
import { PlayIcon, PauseIcon } from "./icons.jsx";
import { displayTitle } from "../titleHint.js";

/**
 * In-round media stage: vinyl turntable (default) or shared cassette shell.
 * Playback wiring stays in the parent — this only renders + optional activate.
 */
export default function GuessMedia({
  mode = "vinyl",
  revealed = false,
  spinning = false,
  celebrate = false,
  cover = null,
  title = "",
  artist = "",
  canControl = false,
  interactive = true,
  cueing = false,
  vinylTitle,
  onTogglePlay,
  onPrimeAudio,
  onScrubStart,
  onScrubEnd,
}) {
  const shownTitle = displayTitle(title);
  if (mode === "cassette") {
    const label =
      revealed && shownTitle
        ? `${shownTitle}${artist ? ` — ${artist}` : ""}`
        : "";
    return (
      <div
        className={`guess-media guess-media--cassette ${
          celebrate ? "guess-media--celebrate" : ""
        }`}
      >
        {celebrate && (
          <>
            <span className="win-ring win-ring--1" aria-hidden="true" />
            <span className="win-ring win-ring--2" aria-hidden="true" />
            <span className="win-ring win-ring--3" aria-hidden="true" />
          </>
        )}
        <CassetteShell
          done={revealed}
          spinning={spinning || celebrate}
          cover={cover}
          label={label}
          onActivate={canControl && !cueing ? onTogglePlay : undefined}
        />
      </div>
    );
  }

  const live = canControl && !cueing;

  return (
    <div
      className={`turntable turntable--game turntable--md ${
        celebrate ? "turntable--celebrate" : ""
      }`}
    >
      {celebrate && (
        <>
          <span className="win-ring win-ring--1" aria-hidden="true" />
          <span className="win-ring win-ring--2" aria-hidden="true" />
          <span className="win-ring win-ring--3" aria-hidden="true" />
        </>
      )}
      <div className="platter" aria-hidden="true" />
      <ScrubbableVinyl
        className={`vinyl--md ${revealed ? "vinyl--revealed" : ""}`}
        spin={spinning ? "fast" : false}
        enabled={interactive && !cueing}
        title={cueing ? "cueing the record…" : vinylTitle}
        onClick={live ? onTogglePlay : undefined}
        onPrimeAudio={live ? onPrimeAudio : undefined}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      >
        {revealed && cover ? (
          <img src={cover} alt="" className="vinyl-cover" draggable={false} />
        ) : (
          <div className="vinyl-label" aria-hidden="true" />
        )}
      </ScrubbableVinyl>
      {cueing && !revealed ? (
        <span
          className="vinyl-cue vinyl-cue--loading"
          role="status"
          aria-live="polite"
          aria-label="cueing the record"
        >
          <span className="vinyl-cue-spin" aria-hidden="true" />
        </span>
      ) : (
        live && (
          <button
            type="button"
            className="vinyl-cue"
            aria-label={spinning ? "Pause preview" : "Play preview"}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay?.();
            }}
          >
            {spinning ? (
              <PauseIcon className="vinyl-cue-ico" />
            ) : (
              <PlayIcon className="vinyl-cue-ico" />
            )}
          </button>
        )
      )}
      <div className={`tonearm ${spinning ? "tonearm--on" : ""}`} />
      {!revealed && interactive && !cueing && <SpinMeNudge />}
    </div>
  );
}
