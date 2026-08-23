import { useEffect, useRef, useState } from "react";
import { THEMES, applyTheme, paletteFor, markThemeTouched } from "../themes.js";
import ThemeNudge from "./ThemeNudge.jsx";
import { SunIcon } from "./icons.jsx";

/** Landing only — `/` home or login. Mid-flow paths must not Safari-reload. */
function isLandingPath() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  return p === "/";
}

export default function ThemeSwitcher({
  current,
  mode = "dark",
  onChange,
  onModeChange,
  inline = false,
}) {
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

  function toggleMode() {
    const next = mode === "light" ? "dark" : "light";
    applyTheme(current, { mode: next, safariReload: isLandingPath() });
    onModeChange?.(next);
    window.dispatchEvent(new CustomEvent("guessify:theme-picked"));
  }

  return (
    <div
      className={`theme-switcher${flash ? " theme-switcher--flash" : ""}${
        inline ? " theme-switcher--inline" : ""
      }`}
      ref={ref}
    >
      <button
        className="theme-btn"
        onClick={() => {
          markThemeTouched();
          setOpen((o) => !o);
        }}
        title="change theme"
      >
        <span className="theme-dot" style={{ background: "var(--main-color)" }} />
        <span className="theme-btn-label">
          {open ? THEMES[current]?.name || "theme" : "theme"}
        </span>
      </button>
      {!open && !inline && <ThemeNudge />}
      {open && (
        <div className="theme-menu" onMouseLeave={restore}>
          <button
            type="button"
            className={`theme-option theme-mode-row${mode === "light" ? " is-on" : ""}`}
            role="switch"
            aria-checked={mode === "light"}
            onMouseEnter={restore}
            onClick={toggleMode}
          >
            <SunIcon className="theme-mode-ico" width="16" height="16" />
            light mode
          </button>
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
