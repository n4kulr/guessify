import ScrubbableVinyl from "./ScrubbableVinyl.jsx";
import CassetteShell from "./CassetteShell.jsx";

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
  vinylTitle,
  onTogglePlay,
  onScrubStart,
  onScrubEnd,
}) {
  if (mode === "cassette") {
    const label =
      revealed && title
        ? `${title}${artist ? ` — ${artist}` : ""}`
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
          onActivate={canControl ? onTogglePlay : undefined}
        />
      </div>
    );
  }

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
        enabled={interactive}
        title={vinylTitle}
        onClick={canControl ? onTogglePlay : undefined}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      >
        {revealed && cover ? (
          <img src={cover} alt="" className="vinyl-cover" draggable={false} />
        ) : (
          <div className="vinyl-label" aria-hidden="true" />
        )}
      </ScrubbableVinyl>
      <div className={`tonearm ${spinning ? "tonearm--on" : ""}`} />
    </div>
  );
}
