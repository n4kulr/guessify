import { useState } from "react";
import { playCassetteButton } from "../cassetteSounds.js";

const TEETH = [
  { id: "rew", label: "rewind", icon: "⏮" },
  { id: "play", label: "play", icon: "▶" },
  { id: "pause", label: "pause", icon: "⏸" },
  { id: "ff", label: "fast forward", icon: "⏭" },
];

/**
 * Shared cassette face used by the landing demo and in-game media stage.
 * `interactiveTeeth` enables the sprocket click + blip (demo). Game mode
 * can pass `onActivate` to toggle play/pause via the shell.
 * Pass `muteControl` on the demo to replace ⏭ with mute / unmute.
 */
export default function CassetteShell({
  done = false,
  spinning = true,
  cover = null,
  label = "",
  mysteryText = "??? side a",
  interactiveTeeth = false,
  muteControl = null,
  onActivate,
  className = "",
}) {
  const [pressed, setPressed] = useState(null);
  const reelSpin = spinning ? (done ? "spin-slow" : "spin-fast") : "";

  const teeth = muteControl
    ? TEETH.map((t) =>
        t.id === "ff"
          ? {
              id: "mute",
              label: muteControl.muted ? "unmute audio" : "mute audio",
              icon: muteControl.muted ? "🔇" : "🔊",
            }
          : t
      )
    : TEETH;

  function tapTooth(i, tooth, e) {
    e.stopPropagation();
    if (!interactiveTeeth) return;
    setPressed(i);
    playCassetteButton(i);
    if (tooth.id === "mute") muteControl?.onToggle?.();
    window.setTimeout(() => setPressed(null), 160);
  }

  const shellProps = onActivate
    ? {
        role: "button",
        tabIndex: 0,
        onClick: onActivate,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActivate();
          }
        },
      }
    : {};

  return (
    <div className={`cassette ${done ? "is-done" : ""} ${className}`.trim()}>
      <div
        className={`cassette-shell${onActivate ? " cassette-shell--interactive" : ""}`}
        {...shellProps}
      >
        <span className="cassette-screw cassette-screw--tl" aria-hidden="true" />
        <span className="cassette-screw cassette-screw--tr" aria-hidden="true" />
        <span className="cassette-screw cassette-screw--bl" aria-hidden="true" />
        <span className="cassette-screw cassette-screw--br" aria-hidden="true" />
        <span className="cassette-side-mark" aria-hidden="true">
          A
        </span>

        <div
          className={`cassette-label ${done ? "cassette-label--solved" : ""}`}
        >
          {done && cover ? (
            <>
              <img
                className="cassette-cover"
                src={cover}
                alt=""
                width={18}
                height={18}
                decoding="async"
              />
              <div className="cassette-marquee">
                <span className="cassette-marquee-track">
                  <span>{label}</span>
                  <span aria-hidden="true">{label}</span>
                </span>
              </div>
            </>
          ) : done && label ? (
            label
          ) : (
            mysteryText
          )}
        </div>

        <div className="cassette-window">
          <span
            className={`cassette-reel cassette-reel--left ${reelSpin}`}
            aria-hidden="true"
          />
          <span
            className={`cassette-reel cassette-reel--right ${reelSpin}`}
            aria-hidden="true"
          />
        </div>

        <div className="cassette-sprockets">
          {teeth.map((tooth, i) =>
            interactiveTeeth ? (
              <button
                key={tooth.id}
                type="button"
                className={`cassette-tooth ${pressed === i ? "is-pressed" : ""}`}
                aria-label={tooth.label}
                aria-pressed={tooth.id === "mute" ? !!muteControl?.muted : undefined}
                onClick={(e) => tapTooth(i, tooth, e)}
              >
                <span className="cassette-tooth-icon" aria-hidden="true">
                  {tooth.icon}
                </span>
              </button>
            ) : (
              <span
                key={tooth.id}
                className="cassette-tooth cassette-tooth--static"
                aria-hidden="true"
              >
                <span className="cassette-tooth-icon">{tooth.icon}</span>
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
