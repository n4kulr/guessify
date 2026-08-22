import { useEffect, useRef, useState } from "react";
import {
  THEMES,
  applyTheme,
  paletteFor,
  currentThemeKey,
} from "../themes.js";
import ThemeNudge from "./ThemeNudge.jsx";
import { SunIcon } from "./icons.jsx";

/** Landing only — `/` home or login. Mid-flow paths must not Safari-reload. */
function isLandingPath() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  return p === "/";
}

export function ThemeModeButton({ mode, onChange }) {
  function toggle() {
    const next = mode === "light" ? "dark" : "light";
    applyTheme(currentThemeKey(), { mode: next, safariReload: isLandingPath() });
    onChange(next);
    window.dispatchEvent(new CustomEvent("guessify:theme-picked"));
  }

  return (
    <button
      type="button"
      className={`theme-mode-btn${mode === "light" ? " is-on" : ""}`}
      title={mode === "light" ? "dark mode" : "light mode"}
      aria-pressed={mode === "light"}
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      onClick={toggle}
    >
      <SunIcon className="theme-mode-ico" width="16" height="16" />
    </button>
  );
}

export default function ThemeSwitcher({ current, mode = "dark", onChange }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const ref = useRef(null);
  const flashTimer = useRef(0);
  const currentRef = useRef(current);
  const modeRef = useRef(mode);
  currentRef.current = current;
  modeRef.current = mode;

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        applyTheme(currentRef.current, { persist: false, mode: modeRef.current });
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  function pick(key) {
    applyTheme(key, { safariReload: isLandingPath(), mode });
    onChange(key);
    setOpen(false);

    // One-shot reaction: switcher pulse + hero vinyl hub flash
    clearTimeout(flashTimer.current);
    setFlash(true);
    window.dispatchEvent(new CustomEvent("guessify:theme-picked"));
    flashTimer.current = window.setTimeout(() => setFlash(false), 700);
  }

  function preview(key) {
    applyTheme(key, { persist: false, mode });
  }

  function restore() {
    applyTheme(currentRef.current, { persist: false, mode: modeRef.current });
  }

  return (
    <div className={`theme-switcher${flash ? " theme-switcher--flash" : ""}`} ref={ref}>
      <button className="theme-btn" onClick={() => setOpen((o) => !o)} title="change theme">
        <span className="theme-dot" style={{ background: "var(--main-color)" }} />
        <span className="theme-btn-label">
          {open ? THEMES[current]?.name || "theme" : "theme"}
        </span>
      </button>
      {!open && <ThemeNudge />}
      {open && (
        <div className="theme-menu" onMouseLeave={restore}>
          {Object.entries(THEMES).map(([key, t]) => {
            const face = paletteFor(key, mode);
            return (
              <button
                key={key}
                className={`theme-option ${key === current ? "active" : ""}`}
                onMouseEnter={() => preview(key)}
                onFocus={() => preview(key)}
                onClick={() => pick(key)}
              >
                <span className="swatches">
                  <span style={{ background: face.bg }} />
                  <span style={{ background: face.main }} />
                  <span style={{ background: face.text }} />
                </span>
                {t.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
