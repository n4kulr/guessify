import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import PlaylistPicker from "./components/PlaylistPicker.jsx";
import Game from "./components/Game.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import { loadTheme } from "./themes.js";

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | loggedOut | loggedIn
  const [me, setMe] = useState(null);
  const [playlist, setPlaylist] = useState(null); // full playlist w/ tracks -> game
  const [picking, setPicking] = useState(false); // true → show playlist picker
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState("serika_dark");
  const [homeNonce, setHomeNonce] = useState(0); // bump to force a fresh picker

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
    setPicking(false);
    setStatus("loggedOut");
  }

  // Logo → branded home (not straight into the crate).
  function goHome() {
    setPlaylist(null);
    setPicking(false);
    setHomeNonce((n) => n + 1);
  }

  // Leave a game back at the picker so they can swap crates quickly.
  function leaveGame() {
    setPlaylist(null);
    setPicking(true);
    setHomeNonce((n) => n + 1);
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

        {status === "loggedIn" && !playlist && !picking && (
          <Home me={me} onStart={() => setPicking(true)} />
        )}

        {status === "loggedIn" && !playlist && picking && (
          <PlaylistPicker
            key={homeNonce}
            onPick={setPlaylist}
            onBack={goHome}
          />
        )}

        {status === "loggedIn" && playlist && (
          <Game playlist={playlist} onExit={leaveGame} />
        )}
      </main>

      <footer className="footer">made for fun · not affiliated with Spotify</footer>
    </div>
  );
}
