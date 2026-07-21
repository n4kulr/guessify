import { useEffect, useRef, useState } from "react";
import { THEMES, applyTheme } from "../themes.js";

export default function ThemeSwitcher({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(key) {
    applyTheme(key);
    onChange(key);
    setOpen(false);
  }

  return (
    <div className="theme-switcher" ref={ref}>
      <button className="theme-btn" onClick={() => setOpen((o) => !o)} title="change theme">
        <span className="theme-dot" style={{ background: "var(--main-color)" }} />
        {THEMES[current]?.name || "theme"}
      </button>
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
