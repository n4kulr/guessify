import { useEffect, useRef, useState } from "react";
import { THEMES, applyTheme } from "../themes.js";
import ThemeNudge from "./ThemeNudge.jsx";

export default function ThemeSwitcher({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const ref = useRef(null);
  const flashTimer = useRef(0);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  function pick(key) {
    applyTheme(key);
    onChange(key);
    setOpen(false);

    // One-shot reaction: switcher pulse + hero vinyl hub flash
    clearTimeout(flashTimer.current);
    setFlash(true);
    window.dispatchEvent(new CustomEvent("guessify:theme-picked"));
    flashTimer.current = window.setTimeout(() => setFlash(false), 700);
  }

  return (
    <div className={`theme-switcher${flash ? " theme-switcher--flash" : ""}`} ref={ref}>
      <button className="theme-btn" onClick={() => setOpen((o) => !o)} title="change theme">
        <span className="theme-dot" style={{ background: "var(--main-color)" }} />
        <span className="theme-btn-label">{THEMES[current]?.name || "theme"}</span>
      </button>
      {!open && <ThemeNudge />}
      {open && (
        <div className="theme-menu">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              className={`theme-option ${key === current ? "active" : ""}`}
              onClick={() => pick(key)}
            >
              <span className="swatches">
                <span style={{ background: t.bg }} />
                <span style={{ background: t.main }} />
                <span style={{ background: t.text }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
