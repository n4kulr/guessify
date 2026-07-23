import { useEffect, useRef, useState } from "react";
import PlayerAvatar from "./PlayerAvatar.jsx";
import {
  PLAYER_COLORS,
  randomAvatar,
  normalizeAvatar,
} from "./constants.js";

/**
 * Compact nickname + randomize + accent dropdown.
 * Calls onChange({ name, avatar }) whenever something updates.
 */
export default function ProfileEditor({
  name: nameProp = "",
  avatar: avatarProp,
  onChange,
  showRandom = true,
}) {
  const [name, setName] = useState(nameProp);
  const [avatar, setAvatar] = useState(() =>
    normalizeAvatar(avatarProp || randomAvatar())
  );
  const [accentOpen, setAccentOpen] = useState(false);
  const accentRef = useRef(null);
  const didEmitInit = useRef(false);

  useEffect(() => {
    if (nameProp && nameProp !== name) setName(nameProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameProp]);

  useEffect(() => {
    if (avatarProp) setAvatar(normalizeAvatar(avatarProp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarProp?.peep, avatarProp?.color]);

  // Publish the starting look once so parent state matches what we show.
  useEffect(() => {
    if (didEmitInit.current) return;
    didEmitInit.current = true;
    onChange?.({ name, avatar });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accentOpen) return;
    function onDoc(e) {
      if (!accentRef.current?.contains(e.target)) setAccentOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [accentOpen]);

  function emit(nextName, nextAvatar) {
    onChange?.({
      name: nextName,
      avatar: normalizeAvatar(nextAvatar),
    });
  }

  function patchAvatar(partial) {
    const next = normalizeAvatar({ ...avatar, ...partial });
    setAvatar(next);
    emit(name, next);
  }

  function onName(v) {
    setName(v);
    emit(v, avatar);
  }

  function randomize() {
    const next = randomAvatar();
    setAvatar(next);
    emit(name, next);
  }

  return (
    <div className="profile-editor">
      <PlayerAvatar avatar={avatar} size={56} />
      <div className="profile-fields">
        <input
          className="guess-input profile-name"
          placeholder="nickname…"
          value={name}
          maxLength={16}
          onChange={(e) => onName(e.target.value)}
        />
        <div className="profile-actions">
          {showRandom && (
            <button type="button" className="btn btn-mini" onClick={randomize}>
              randomize
            </button>
          )}
          <div className="profile-accent" ref={accentRef}>
            <button
              type="button"
              className={`btn btn-mini profile-accent-btn ${accentOpen ? "open" : ""}`}
              onClick={() => setAccentOpen((o) => !o)}
              aria-expanded={accentOpen}
              aria-haspopup="true"
            >
              <span
                className="profile-accent-dot"
                style={{ background: avatar.color }}
                aria-hidden="true"
              />
              accent
            </button>
            {accentOpen && (
              <div className="profile-accent-menu" role="listbox" aria-label="accent colors">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="option"
                    aria-selected={avatar.color === c}
                    className={`profile-swatch ${avatar.color === c ? "active" : ""}`}
                    style={{ background: c }}
                    onClick={() => {
                      patchAvatar({ color: c });
                      setAccentOpen(false);
                    }}
                    aria-label={`color ${c}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
