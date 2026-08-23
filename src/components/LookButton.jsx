import { useEffect, useRef, useState } from "react";
import PlayerAvatar from "../multiplayer/PlayerAvatar.jsx";
import ProfileEditor from "../multiplayer/ProfileEditor.jsx";
import ThemeSwitcher from "./ThemeSwitcher.jsx";
import { loadLocalProfile, saveLocalProfile } from "../localProfile.js";

/**
 * Topbar squircle: current Open Peep, opens look editor anytime.
 * First visit seeds a random avatar into localStorage.
 */
export default function LookButton({ theme, themeMode, onTheme, onThemeMode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(loadLocalProfile);
  const ref = useRef(null);
  const skipInit = useRef(true);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function onChange(next) {
    setDraft(next);
    if (skipInit.current) {
      skipInit.current = false;
      return;
    }
    saveLocalProfile(next, { customized: true });
  }

  return (
    <div className={`look-switcher${open ? " is-open" : ""}`} ref={ref}>
      {open && (
        <div
          className="spotlight-scrim"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        className="volume-btn look-btn"
        title="your look"
        aria-label="customize look"
        aria-expanded={open}
        onClick={() =>
          setOpen((o) => {
            if (!o) skipInit.current = true;
            return !o;
          })
        }
      >
        <PlayerAvatar avatar={draft.avatar} size={33} className="look-btn-face" />
      </button>
      {open && (
        <div className="look-menu">
          <p className="profile-dd-label">your look</p>
          <ProfileEditor
            compact
            name={draft.name}
            avatar={draft.avatar}
            onChange={onChange}
          />
          {/* Phones drop the topbar theme button; it lives here instead. */}
          <div className="look-menu-theme">
            <ThemeSwitcher
              inline
              current={theme}
              mode={themeMode}
              onChange={onTheme}
              onModeChange={onThemeMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
