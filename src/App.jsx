import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import PlaylistPicker from "./components/PlaylistPicker.jsx";
import Game from "./components/Game.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import { loadTheme } from "./themes.js";

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | loggedOut | loggedIn
  const [me, setMe] = useState(null);
  const [playlist, setPlaylist] = useState(null); // full playlist w/ tracks -> game
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState("serika_dark");

  useEffect(() => {
    setTheme(loadTheme());
    // Surface any ?error= from the OAuth redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setAuthError(params.get("error"));
      window.history.replaceState({}, "", window.location.pathname);
    }
    checkMe();
  }, []);

  async function checkMe() {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.ok) {
        setMe(await res.json());
        setStatus("loggedIn");
      } else {
        setStatus("loggedOut");
      }
    } catch {
      setStatus("loggedOut");
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setMe(null);
    setPlaylist(null);
    setStatus("loggedOut");
  }

  // Clicking the logo returns to the home screen (playlist picker / login).
  function goHome() {
    setPlaylist(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="logo" onClick={goHome} title="home">
          <span className="logo-disc" aria-hidden="true" />
          <span className="logo-word">
            guess<span className="logo-accent">ify</span>
          </span>
        </button>

        <div className="topbar-right">
          <ThemeSwitcher current={theme} onChange={setTheme} />
          {status === "loggedIn" && (
            <div className="user-chip">
              {me?.image && <img src={me.image} alt="" className="user-avatar" />}
              <span className="user-name">{me?.displayName || "you"}</span>
              <button className="btn btn-mini" onClick={logout}>
                log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="stage">
        {status === "checking" && <div className="loader">loading…</div>}

        {status === "loggedOut" && <Login error={authError} />}

        {status === "loggedIn" && !playlist && <PlaylistPicker onPick={setPlaylist} />}

        {status === "loggedIn" && playlist && (
          <Game playlist={playlist} onExit={() => setPlaylist(null)} />
        )}
      </main>

      <footer className="footer">made for fun · not affiliated with Spotify</footer>
    </div>
  );
}
