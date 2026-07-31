import { useEffect, useMemo, useRef, useState } from "react";
import PlayerAvatar from "./PlayerAvatar.jsx";
import {
  PLAYER_COLORS,
  PEEP_COUNT,
  peepSrc,
  randomAvatar,
  normalizeAvatar,
} from "./constants.js";
import { applyThemeForAccent, accentMatchingTheme } from "../themes.js";

function syncThemeFromAccent(color) {
  if (!color) return;
  const key = applyThemeForAccent(color);
  window.dispatchEvent(
    new CustomEvent("guessify:theme-from-accent", { detail: { key, color } })
  );
  window.dispatchEvent(new CustomEvent("guessify:theme-picked"));
}

function avatarMatchingTheme(raw) {
  const base = normalizeAvatar(raw || randomAvatar());
  return normalizeAvatar({
    ...base,
    color: accentMatchingTheme(PLAYER_COLORS),
  });
}

/**
 * Compact nickname + randomize + peep + accent.
 * Calls onChange({ name, avatar }) whenever something updates.
 * Accent / randomize also switches the app theme to match.
 */
export default function ProfileEditor({
  name: nameProp = "",
  avatar: avatarProp,
  onChange,
  showRandom = true,
}) {
  const [name, setName] = useState(nameProp);
  const [avatar, setAvatar] = useState(() =>
    avatarMatchingTheme(avatarProp || randomAvatar())
  );
  const [menu, setMenu] = useState(null); // null | "peep" | "accent"
  const peepRef = useRef(null);
  const accentRef = useRef(null);
  const didEmitInit = useRef(false);
  const peepIds = useMemo(
    () => Array.from({ length: PEEP_COUNT }, (_, i) => i + 1),
    []
  );

  useEffect(() => {
    if (nameProp && nameProp !== name) setName(nameProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameProp]);

  useEffect(() => {
    if (avatarProp) setAvatar(normalizeAvatar(avatarProp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarProp?.peep, avatarProp?.color]);

  // Publish the starting look once so parent state matches what we show.
  // Keep the current theme — pin accent to it; don't overwrite the theme.
  useEffect(() => {
    if (didEmitInit.current) return;
    didEmitInit.current = true;
    onChange?.({ name, avatar });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!menu) return;
    function onDoc(e) {
      const t = e.target;
      if (peepRef.current?.contains(t) || accentRef.current?.contains(t)) return;
      setMenu(null);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [menu]);

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
    if (partial.color) syncThemeFromAccent(next.color);
  }

  function onName(v) {
    setName(v);
    emit(v, avatar);
  }

  function randomize() {
    const next = randomAvatar();
    setAvatar(next);
    emit(name, next);
    syncThemeFromAccent(next.color);
    setMenu(null);
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
          <div className="profile-peep" ref={peepRef}>
            <button
              type="button"
              className={`btn btn-mini profile-icon-btn ${menu === "peep" ? "open" : ""}`}
              onClick={() => setMenu((m) => (m === "peep" ? null : "peep"))}
              aria-expanded={menu === "peep"}
              aria-haspopup="true"
            >
              icon
            </button>
            {menu === "peep" && (
              <div className="profile-peep-menu" role="listbox" aria-label="icons">
                {peepIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={avatar.peep === id}
                    className={`profile-peep-swatch ${avatar.peep === id ? "active" : ""}`}
                    style={{ background: avatar.color }}
                    onClick={() => {
                      patchAvatar({ peep: id });
                      setMenu(null);
                    }}
                    aria-label={`icon ${id}`}
                  >
                    <img src={peepSrc(id)} alt="" draggable={false} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="profile-accent" ref={accentRef}>
            <button
              type="button"
              className={`btn btn-mini profile-accent-btn ${menu === "accent" ? "open" : ""}`}
              onClick={() => setMenu((m) => (m === "accent" ? null : "accent"))}
              aria-expanded={menu === "accent"}
              aria-haspopup="true"
            >
              <span
                className="profile-accent-dot"
                style={{ background: avatar.color }}
                aria-hidden="true"
              />
              accent
            </button>
            {menu === "accent" && (
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
                      setMenu(null);
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
