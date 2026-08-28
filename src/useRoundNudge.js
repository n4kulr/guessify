import { useEffect, useRef, useState } from "react";
import { isFastTest } from "./fastTest.js";
import { roundNudgeWaitMs } from "./skipNudge.js";

/**
 * Pulses per round:
 * - Play switch after 3s idle
 * - Skip after 15s of hearing with no skip
 * - Guess button after 2.5s idle when draft text is typed
 * - Next song after 4s un-advanced on reveal screen
 * Play, skip, guess, and reveal nudge independently. No label — CSS pulse only.
 */
export function useRoundNudge({
  active,
  playing,
  skipCount,
  resetKey,
  hasDraft = false,
  revealed = false,
}) {
  const [playNudge, setPlayNudge] = useState(false);
  const [skipNudge, setSkipNudge] = useState(false);
  const [guessNudge, setGuessNudge] = useState(false);
  const [revealNudge, setRevealNudge] = useState(false);
  const [heard, setHeard] = useState(false);
  const [armedKey, setArmedKey] = useState(resetKey);
  const playUsedRef = useRef(false);
  const skipUsedRef = useRef(false);

  if (armedKey !== resetKey) {
    setArmedKey(resetKey);
    setHeard(false);
    setPlayNudge(false);
    setSkipNudge(false);
    setGuessNudge(false);
    setRevealNudge(false);
    playUsedRef.current = false;
    skipUsedRef.current = false;
  }

  useEffect(() => {
    if (!playing) return;
    setHeard(true);
    setPlayNudge(false);
    playUsedRef.current = true;
  }, [playing]);

  useEffect(() => {
    if (skipCount > 0) {
      skipUsedRef.current = true;
      setSkipNudge(false);
    }
  }, [skipCount]);

  useEffect(() => {
    if (!active) {
      setPlayNudge(false);
      return undefined;
    }
    if (playUsedRef.current || skipCount > 0 || heard) return undefined;

    const timer = window.setTimeout(() => {
      if (playUsedRef.current) return;
      playUsedRef.current = true;
      setPlayNudge(true);
    }, roundNudgeWaitMs("play", isFastTest()));
    return () => window.clearTimeout(timer);
  }, [active, heard, skipCount, resetKey]);

  useEffect(() => {
    if (!active) {
      setSkipNudge(false);
      return undefined;
    }
    if (skipUsedRef.current || skipCount > 0 || !heard) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (skipUsedRef.current) return;
      skipUsedRef.current = true;
      setSkipNudge(true);
    }, roundNudgeWaitMs("skip", isFastTest()));
    return () => window.clearTimeout(timer);
  }, [active, heard, skipCount, resetKey]);

  useEffect(() => {
    if (!active || !hasDraft || revealed) {
      setGuessNudge(false);
      return undefined;
    }
    setGuessNudge(false);
    const timer = window.setTimeout(() => {
      setGuessNudge(true);
    }, roundNudgeWaitMs("guess", isFastTest()));
    return () => window.clearTimeout(timer);
  }, [active, hasDraft, revealed]);

  useEffect(() => {
    if (!revealed) {
      setRevealNudge(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setRevealNudge(true);
    }, roundNudgeWaitMs("reveal", isFastTest()));
    return () => window.clearTimeout(timer);
  }, [revealed, resetKey]);

  return { playNudge, skipNudge, guessNudge, revealNudge };
}
