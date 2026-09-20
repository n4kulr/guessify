import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";

// Shared Jev (System One) helpers for Vercel API routes.
// Fail open everywhere: missing key / timeout / error → null, callers keep old behaviour.

const FEEDBACK_TIMEOUT_MS = 2500;
const CHART_TIMEOUT_MS = 2000;
const SUGGEST_TIMEOUT_MS = 450;

/** Spam Noul above this → drop feedback. */
export const FEEDBACK_SPAM_BLOCK = 0.72;
/** Chart Choice below this confidence → ignore and fall back. */
export const CHART_PICK_MIN_CONF = 0.45;
/** Weight for Jev Score when blending with catalogue rank (0–1). */
export const SUGGEST_JEV_WEIGHT = 0.55;

let client;
let clientTried = false;

function getClient() {
  if (clientTried) return client;
  clientTried = true;
  if (!process.env.TYPESAFE_API_KEY?.trim()) {
    client = null;
    return client;
  }
  try {
    client = new TypeSafeClient({
      timeout: FEEDBACK_TIMEOUT_MS,
      retry: { maxRetries: 0 },
      logLevel: "error",
    });
  } catch (e) {
    console.error("typesafe client", e);
    client = null;
  }
  return client;
}

async function ask(state, questions, timeoutMs) {
  const c = getClient();
  if (!c) return null;
  try {
    return await c.systemOne(
      { state, questions },
      { timeout: timeoutMs, retry: { maxRetries: 0 } }
    );
  } catch (e) {
    console.error("typesafe ask", e?.message || e);
    return null;
  }
}

const FEEDBACK_CATEGORY = {
  bug: "A defect, crash, wrong behaviour, or broken UI.",
  feature: "A request for new behaviour or a product idea.",
  praise: "Positive feedback, thanks, or appreciation.",
  other: "Anything else that does not fit the above.",
};

const URGENCY_LEVELS = [
  "Not urgent — optional polish or a nice-to-have.",
  "Mild — noticeable but the game still works.",
  "Important — hurts play for some users; should be addressed soon.",
  "Critical — crash, data loss, or the game is unusable.",
];

/**
 * Triage free-text feedback. Returns null when Jev is unavailable.
 * @returns {Promise<{ spam: number, category: string, urgency: number, block: boolean } | null>}
 */
export async function triageFeedback(message) {
  const text = String(message || "").trim();
  if (!text) return null;

  const result = await ask(
    { message: text },
    {
      spam: noul(
        "Is this feedback spam, abuse, phishing, or empty nonsense that should not reach the team?",
        {
          true: "Spam, harassment, credential theft, or gibberish.",
          false: "A real player message worth reading.",
        }
      ),
      category: choice(
        "What kind of product feedback is `message`?",
        FEEDBACK_CATEGORY
      ),
      urgency: score(
        "How urgently should the Guessify team act on `message`?",
        URGENCY_LEVELS
      ),
    },
    FEEDBACK_TIMEOUT_MS
  );
  if (!result) return null;

  const spam = Number(result.answers.spam?.noul);
  const category = String(result.answers.category?.choice || "other");
  const urgency = Number(result.answers.urgency?.score);
  if (!Number.isFinite(spam)) return null;

  return {
    spam,
    category: category in FEEDBACK_CATEGORY ? category : "other",
    urgency: Number.isFinite(urgency) ? urgency : 0,
    block: spam >= FEEDBACK_SPAM_BLOCK,
  };
}

/**
 * Pick the best Last.fm chart candidate for a free-text query.
 * @param {string} query
 * @param {{ kind: string, name: string }[]} candidates
 * @returns {Promise<{ kind: string, name: string } | null>}
 */
export async function pickChartCandidate(query, candidates) {
  const list = (candidates || []).slice(0, 12);
  if (!list.length) return null;

  const criteria = {
    none: "None of these artists or tags is a good match for the player's query.",
  };
  const byId = {};
  list.forEach((c, i) => {
    const id = `c${i}`;
    byId[id] = c;
    criteria[id] = `${c.kind} named “${c.name}”`;
  });

  const result = await ask(
    {
      query: String(query || "").trim(),
      candidates: list.map((c, i) => ({
        id: `c${i}`,
        kind: c.kind,
        name: c.name,
      })),
    },
    {
      pick: choice(
        "Which candidate best matches what the player typed in `query`? Prefer an exact artist name when they named a person/band; prefer a tag/era vibe when they described a genre or decade. Choose `none` if nothing fits.",
        criteria
      ),
    },
    CHART_TIMEOUT_MS
  );
  if (!result) return null;

  const pick = result.answers.pick;
  const id = pick?.choice;
  const conf = Number(pick?.confidence) || 0;
  if (!id || id === "none" || conf < CHART_PICK_MIN_CONF) return null;
  return byId[id] || null;
}

const MATCH_LEVELS = [
  "Unrelated to the typed query.",
  "Weak or partial overlap with the query.",
  "Good match for what they are typing.",
  "Clear intended autocomplete row for this query.",
];

/**
 * Reorder catalogue suggestion rows using Jev Scores. Returns null on miss.
 * @param {string} query
 * @param {{ name: string, artist?: string | null }[]} items
 * @param {"track" | "artist"} kind
 */
export async function rerankSuggestions(query, items, kind = "artist") {
  const rows = (items || []).slice(0, 12);
  if (rows.length < 2) return null;

  const questions = {};
  rows.forEach((row, i) => {
    const label =
      kind === "track" && row.artist
        ? `track “${row.name}” by ${row.artist}`
        : `${kind} “${row.name}”`;
    questions[`c${i}`] = score(
      {
        task: "Rate how well this autocomplete candidate matches the player's typed query.",
        candidate: label,
      },
      MATCH_LEVELS
    );
  });

  const result = await ask(
    {
      query: String(query || "").trim(),
      kind,
      candidates: rows.map((row, i) => ({
        id: `c${i}`,
        name: row.name,
        artist: row.artist || null,
      })),
    },
    questions,
    SUGGEST_TIMEOUT_MS
  );
  if (!result) return null;

  const scored = rows.map((row, i) => {
    const ans = result.answers[`c${i}`];
    const jev = Number(ans?.score);
    return {
      row,
      jev: Number.isFinite(jev) ? jev : 0,
      // Catalogue order as a weak tie-breaker (earlier = better).
      catalogue: (rows.length - i) / rows.length,
    };
  });

  scored.sort(
    (a, b) =>
      blendSuggestScore(b.jev, b.catalogue) -
        blendSuggestScore(a.jev, a.catalogue) || b.jev - a.jev
  );
  return scored.map((s) => s.row);
}

/** Pure blend used by rerank + self-check. */
export function blendSuggestScore(jevScore, catalogueRank01) {
  const j = Number(jevScore) || 0;
  const c = Number(catalogueRank01) || 0;
  return SUGGEST_JEV_WEIGHT * j + (1 - SUGGEST_JEV_WEIGHT) * c * 3;
}
