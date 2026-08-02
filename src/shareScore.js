/**
 * End-of-game share text + native share / clipboard.
 * Links guessify.uk so OG art (og.png) rides along when posted.
 */
export function scoreSharePayload({
  mode = "solo",
  score = 0,
  maxScore = 0,
  place = 0,
  name = "",
} = {}) {
  const url = "https://guessify.uk";
  if (mode === "solo") {
    return {
      title: "guessify",
      text: `I scored ${score}/${maxScore} on guessify — name that song!\n${url}`,
    };
  }
  if (mode === "online") {
    return {
      title: "guessify",
      text: `Finished #${place} with ${score} pts on guessify — name that song!\n${url}`,
    };
  }
  const who = name ? ` as ${name}` : "";
  return {
    title: "guessify",
    text: `Just wrapped a guessify party${who} — ${score} pts\n${url}`,
  };
}

/** @returns {"shared"|"copied"|"cancelled"|"prompt"} */
export async function shareScore(opts) {
  const { title, text } = scoreSharePayload(opts);
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url: "https://guessify.uk" });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    window.prompt("Copy this:", text);
    return "prompt";
  }
}

export function isNoPreviewError(err) {
  return err?.message === "no preview";
}
