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
  // Live retint only — never Safari-reload (that dumps online/host customize → home).
  const key = applyThemeForAccent(color, { persist: false, safariReload: false });
  window.dispatchEvent(
    new CustomEvent("guessify:theme-from-accent", { detail: { key, color } })
  );
  window.dispatchEvent(new CustomEvent("guessify:theme-picked"));
}

/** Balances the accent color dot — solid face with cut-out smile (inverted). */
function SmileyDot() {
  return (
    <svg className="profile-icon-dot" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
      <circle cx="5" cy="5" r="5" fill="currentColor" />
      <circle className="profile-icon-cut" cx="3.4" cy="4.1" r="0.85" />
      <circle className="profile-icon-cut" cx="6.6" cy="4.1" r="0.85" />
      <path
        className="profile-icon-cut-stroke"
        d="M3 6.2c0.6 0.9 2.4 0.9 4 0"
        fill="none"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="profile-dd-chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  compact = false,
}) {
  const [name, setName] = useState(nameProp);
  const [avatar, setAvatar] = useState(() =>
    avatarMatchingTheme(avatarProp || randomAvatar())
  );
  const [menu, setMenu] = useState(null); // null | "peep" | "accent"
  const [shown, setShown] = useState(null);
  const [open, setOpen] = useState(false);
  const peepRef = useRef(null);
  const peepMenuRef = useRef(null);
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
    if (menu) {
      setShown(menu);
      const id = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setOpen(false);
    const t = setTimeout(() => setShown(null), 320);
    return () => clearTimeout(t);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    function onDoc(e) {
      const t = e.target;
      if (
        peepRef.current?.contains(t) ||
        peepMenuRef.current?.contains(t) ||
        accentRef.current?.contains(t)
      )
        return;
      setMenu(null);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [menu]);

  useEffect(() => {
    if (shown !== "peep") return;
    peepMenuRef.current
      ?.querySelector(".profile-peep-swatch.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [shown]);

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
    <div className={`profile-editor${compact ? " profile-editor--compact" : ""}`}>
      {!compact && <PlayerAvatar avatar={avatar} size={56} />}
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
          <div className="profile-icon-accent">
            <div className="profile-peep" ref={peepRef}>
              <button
                type="button"
                className={`btn btn-mini profile-icon-btn ${menu === "peep" ? "open" : ""}`}
                onClick={() => setMenu((m) => (m === "peep" ? null : "peep"))}
                aria-expanded={menu === "peep"}
                aria-haspopup="true"
              >
                <SmileyDot />
                icon
                <Chevron />
              </button>
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
                <Chevron />
              </button>
            </div>
          </div>
        </div>
        <div className={`profile-pick-tray${open ? " is-open" : ""}`}>
          <div className="profile-pick-tray-inner">
        {shown === "peep" && (
          <div
            className="profile-peep-menu"
            ref={peepMenuRef}
            role="listbox"
            aria-label="icons"
          >
            <div className="profile-dd-head">
              <p className="profile-dd-label">pick an icon</p>
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => {
                  let peep = randomAvatar().peep;
                  if (peep === avatar.peep) peep = (peep % PEEP_COUNT) + 1;
                  patchAvatar({ peep });
                }}
              >
                surprise me
              </button>
            </div>
            <div className="profile-peep-grid">
              {peepIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={avatar.peep === id}
                  className={`profile-peep-swatch ${avatar.peep === id ? "active" : ""}`}
                  onClick={() => patchAvatar({ peep: id })}
                  aria-label={`icon ${id}`}
                >
                  <img src={peepSrc(id)} alt="" draggable={false} />
                </button>
              ))}
            </div>
          </div>
        )}
        {shown === "accent" && (
          <div
            className="profile-peep-menu"
            ref={peepMenuRef}
            role="listbox"
            aria-label="accent colors"
          >
            <div className="profile-dd-head">
              <p className="profile-dd-label">pick a color</p>
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => {
                  let color = randomAvatar().color;
                  if (color === avatar.color) {
                    const i = PLAYER_COLORS.indexOf(color);
                    color = PLAYER_COLORS[(Math.max(0, i) + 1) % PLAYER_COLORS.length];
                  }
                  patchAvatar({ color });
                }}
              >
                surprise me
              </button>
            </div>
            <div className="profile-peep-grid profile-peep-grid--fit">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={avatar.color === c}
                  className={`profile-swatch ${avatar.color === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => patchAvatar({ color: c })}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
