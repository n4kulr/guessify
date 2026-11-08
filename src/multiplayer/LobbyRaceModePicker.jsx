import { ClassicModeIcon, TimedModeIcon, FrenzyModeIcon } from "./RaceModeIcons.jsx";
import { normalizeRaceMode, FRENZY_ENABLED } from "./constants.js";

/**
 * Classic / Timed / Frenzy lobby control. Host can flip; guests see the same UI read-only.
 */
export default function LobbyRaceModePicker({
  mode = "classic",
  canEdit = false,
  onPick,
}) {
  const active = normalizeRaceMode(mode);

  function pick(next) {
    if (!canEdit) return;
    const modeNext = normalizeRaceMode(next);
    if (modeNext === active) return;
    onPick?.(modeNext);
  }

  return (
    <>
      <h3 className="mp-side-title">mode</h3>
      <div className="lobby-race-mode" role="group" aria-label="Game mode">
        <button
          type="button"
          className={`lobby-race-mode-btn${active === "classic" ? " is-active" : ""}`}
          aria-pressed={active === "classic"}
          disabled={!canEdit}
          onClick={() => pick("classic")}
        >
          <ClassicModeIcon size={22} />
          <span className="lobby-race-mode-copy">
            <span className="lobby-race-mode-title">Classic</span>
            <span className="lobby-race-mode-blurb">
              first to guess wins — ends round
              <br />
              can see others’ guesses
            </span>
          </span>
        </button>
        <button
          type="button"
          className={`lobby-race-mode-btn${active === "timed" ? " is-active" : ""}`}
          aria-pressed={active === "timed"}
          disabled={!canEdit}
          onClick={() => pick("timed")}
        >
          <TimedModeIcon size={22} />
          <span className="lobby-race-mode-copy">
            <span className="lobby-race-mode-title">Timed</span>
            <span className="lobby-race-mode-blurb">
              45 seconds for everyone
              <br />
              guesses revealed at the end
            </span>
          </span>
        </button>
        {FRENZY_ENABLED && (
          <button
            type="button"
            className={`lobby-race-mode-btn${active === "frenzy" ? " is-active" : ""}`}
            aria-pressed={active === "frenzy"}
            disabled={!canEdit}
            onClick={() => pick("frenzy")}
          >
            <FrenzyModeIcon size={22} />
            <span className="lobby-race-mode-copy">
              <span className="lobby-race-mode-title">Frenzy</span>
              <span className="lobby-race-mode-blurb">
                classic rules, endless rounds
                <br />
                host stops it whenever
              </span>
            </span>
          </button>
        )}
      </div>
      {!canEdit && (
        <p className="fineprint lobby-mode-host-hint">host picks the mode</p>
      )}
    </>
  );
}
