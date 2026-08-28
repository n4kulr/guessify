import { useEffect, useRef, useState } from "react";
import { isFastTest } from "./fastTest.js";
import { roundNudgeWaitMs } from "./skipNudge.js";

/**
 * One pulse per round: play switch after 3s idle, or skip after 20s of hearing
 * with no skip. Never both in the same round. No label — CSS pulse only.
 */
export function useRoundNudge({ active, playing, skipCount, resetKey }) {
  const [playNudge, setPlayNudge] = useState(false);
  const [skipNudge, setSkipNudge] = useState(false);
  const [heard, setHeard] = useState(false);
  const [armedKey, setArmedKey] = useState(resetKey);
  const usedRef = useRef(false);

  if (armedKey !== resetKey) {
    setArmedKey(resetKey);
    setHeard(false);
    setPlayNudge(false);
    setSkipNudge(false);
    usedRef.current = false;
  }

  useEffect(() => {
    if (!playing) return;
    setHeard(true);
    setPlayNudge(false);
  }, [playing]);

  useEffect(() => {
    if (skipCount > 0) {
      usedRef.current = true;
      setSkipNudge(false);
    }
  }, [skipCount]);

  useEffect(() => {
    if (!active) {
      setPlayNudge(false);
      setSkipNudge(false);
      return undefined;
    }
    if (usedRef.current || skipCount > 0 || heard) return undefined;

    const timer = window.setTimeout(() => {
      if (usedRef.current) return;
      usedRef.current = true;
      setPlayNudge(true);
    }, roundNudgeWaitMs("play", isFastTest()));
    return () => window.clearTimeout(timer);
  }, [active, heard, skipCount, resetKey]);

  useEffect(() => {
    if (!active || usedRef.current || skipCount > 0 || !heard) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (usedRef.current) return;
      usedRef.current = true;
      setSkipNudge(true);
    }, roundNudgeWaitMs("skip", isFastTest()));
    return () => window.clearTimeout(timer);
  }, [active, heard, skipCount, resetKey]);

  return { playNudge, skipNudge };
}
