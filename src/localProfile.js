import { normalizeAvatar, randomAvatar } from "./multiplayer/constants.js";

const KEY = "guessify-online-profile";

/** Local nickname + peep for play-online (Spotify name can override the nickname). */
export function loadLocalProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") {
      return { name: "", avatar: randomAvatar() };
    }
    return {
      name: String(raw.name || "").trim().slice(0, 16),
      avatar: normalizeAvatar(raw.avatar || randomAvatar()),
    };
  } catch {
    return { name: "", avatar: randomAvatar() };
  }
}

export function saveLocalProfile({ name, avatar }) {
  const next = {
    name: String(name || "").trim().slice(0, 16),
    avatar: normalizeAvatar(avatar || randomAvatar()),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Prefer Spotify first name when logged in; otherwise saved local nickname. */
export function defaultOnlineName(me) {
  const spotify = me?.displayName?.split(/\s+/)[0]?.trim().slice(0, 16);
  if (spotify) return spotify;
  return loadLocalProfile().name;
}
