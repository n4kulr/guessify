import { useEffect, useRef, useState } from "react";

export default function UserMenu({ me, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const name = me?.displayName || "you";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={`user-menu${open ? " is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="user-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
        onClick={() => setOpen((o) => !o)}
      >
        {me?.image ? (
          <img src={me.image} alt="" className="user-avatar" />
        ) : (
          <span className="user-avatar user-avatar--fallback" aria-hidden="true">
            {initial}
          </span>
        )}
      </button>
      {open && (
        <div className="user-menu-drop" role="menu">
          <div className="user-menu-name">{name}</div>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            log out
          </button>
        </div>
      )}
    </div>
  );
}
