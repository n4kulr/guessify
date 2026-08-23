import { useEffect, useRef } from "react";
import { isHintDue } from "./multiplayer/constants.js";

/**
 * Calls `onDue` once, the moment the free title hint becomes due for a round.
 *
 * Polls rather than using a single timeout because the trigger is a wall-clock
 * moment, not a state change: a classic round gets no broadcast at its 45s mark,
 * and a timed round's deadline can shift if the host restarts it. Half-second
 * ticks are plenty for a threshold measured in tens of seconds.
 */
export function useAutoTitleHint({
  active,
  raceMode,
  roundStartedAt,
  roundEndsAt,
  resetKey,
  onDue,
}) {
  const onDueRef = useRef(onDue);
  onDueRef.current = onDue;

  useEffect(() => {
    if (!active || !roundStartedAt) return undefined;

    let fired = false;
    let id = 0;

    function check() {
      if (fired) return;
      if (!isHintDue({ raceMode, roundStartedAt, roundEndsAt })) return;
      fired = true;
      clearInterval(id);
      onDueRef.current?.();
    }

    id = window.setInterval(check, 500);
    check(); // already past the mark on a rejoin
    return () => clearInterval(id);
  }, [active, raceMode, roundStartedAt, roundEndsAt, resetKey]);
}
