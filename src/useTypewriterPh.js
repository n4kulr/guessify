import { useEffect, useState } from "react";

/** Empty-field typewriter — types and erases each example in order. */
export function useTypewriterPh(examples, paused) {
  const [ph, setPh] = useState("");

  useEffect(() => {
    if (paused) {
      setPh("");
      return;
    }
    const words = examples?.length ? examples : [""];
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPh(words[0]);
      return;
    }

    let cancelled = false;
    let wordIdx = 0;
    let char = 0;
    let deleting = false;
    let pauseLeft = 0;
    let timer = 0;

    function schedule(ms) {
      timer = window.setTimeout(step, ms);
    }

    function step() {
      if (cancelled) return;
      const word = words[wordIdx % words.length];

      if (pauseLeft > 0) {
        pauseLeft -= 1;
        schedule(70);
        return;
      }

      if (!deleting) {
        char += 1;
        setPh(word.slice(0, char));
        if (char >= word.length) {
          deleting = true;
          pauseLeft = 14;
          schedule(70);
          return;
        }
        schedule(95);
        return;
      }

      char -= 1;
      setPh(word.slice(0, Math.max(0, char)));
      if (char <= 0) {
        deleting = false;
        wordIdx += 1;
        pauseLeft = 5;
        schedule(70);
        return;
      }
      schedule(45);
    }

    schedule(400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paused, examples]);

  return ph;
}
