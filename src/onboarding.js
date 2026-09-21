const KEY = "guessify-onboarding-v3";

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // no storage → don't loop the demo
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearOnboardingSeen() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** One-track demo playlist: Blinding Lights via /api/preview. */
export async function loadOnboardingPlaylist() {
  const qs = new URLSearchParams({
    title: "Blinding Lights",
    artist: "The Weeknd",
  });
  const res = await fetch(`/api/preview?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.previewUrl) {
    throw new Error(data.error || "preview missing");
  }
  const cover = data.artworkUrl
    ? String(data.artworkUrl).replace("100x100", "600x600")
    : null;
  return {
    id: "onboarding-blinding-lights",
    name: "Quick demo",
    owner: "guessify",
    cover,
    total: 1,
    playableCount: 1,
    tracks: [
      {
        id: "onboarding-blinding-lights",
        name: data.trackName || "Blinding Lights",
        artists: [data.artistName || "The Weeknd"],
        previewUrl: data.previewUrl,
        cover,
      },
    ],
  };
}
