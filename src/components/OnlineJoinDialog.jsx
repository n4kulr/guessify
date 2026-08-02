import { useEffect, useId, useRef, useState } from "react";
import ProfileEditor from "../multiplayer/ProfileEditor.jsx";
import {
  defaultOnlineName,
  loadLocalProfile,
  saveLocalProfile,
} from "../localProfile.js";
import { normalizeAvatar, randomAvatar, PLAYER_COLORS } from "../multiplayer/constants.js";
import { accentMatchingTheme } from "../themes.js";

/**
 * Spotlight-style profile sheet: nickname + peep + accent (online join / host).
 */
export default function OnlineJoinDialog({
  me,
  onJoin,
  onCancel,
  title = "join race",
  hint = "pick a name - and customize!",
  submitLabel = "find a room",
}) {
  const titleId = useId();
  const local = loadLocalProfile();
  const [draft, setDraft] = useState(() => {
    const base = normalizeAvatar(local.avatar || randomAvatar());
    return {
      name: defaultOnlineName(me) || local.name || "",
      avatar: normalizeAvatar({
        ...base,
        color: accentMatchingTheme(PLAYER_COLORS),
      }),
    };
  });
  const cardRef = useRef(null);

  useEffect(() => {
    // Autofocus zooms iPhone Safari when the input is <16px — skip on touch.
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)")?.matches;
    const t = coarse
      ? null
      : window.setTimeout(() => {
          cardRef.current?.querySelector("input")?.focus();
        }, 40);
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      if (t != null) clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const canJoin = !!draft.name.trim();

  function submit(e) {
    e?.preventDefault?.();
    if (!canJoin) return;
    const saved = saveLocalProfile(draft, { customized: true });
    onJoin?.(saved);
  }

  return (
    <div
      className="spotlight-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <form
        className="spotlight-card"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
      >
        <div className="spotlight-head">
          <h2 id={titleId} className="spotlight-title">
            {title}
          </h2>
          <p className="spotlight-hint">{hint}</p>
        </div>
        <ProfileEditor
          name={draft.name}
          avatar={draft.avatar}
          onChange={setDraft}
        />
        <div className="spotlight-actions">
          <button type="button" className="btn btn-mini" onClick={onCancel}>
            cancel
          </button>
          <button
            type="submit"
            className="btn btn-big btn-play"
            disabled={!canJoin}
          >
            <span className="btn-play-icon" aria-hidden="true" />
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
