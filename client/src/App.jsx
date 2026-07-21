import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import PlaylistPicker from "./components/PlaylistPicker.jsx";
import Game from "./components/Game.jsx";

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | loggedOut | loggedIn
  const [me, setMe] = useState(null);
  const [playlist, setPlaylist] = useState(null); // full playlist w/ tracks -> game
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
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

  return (
    <div className="app">
      <div className="bg-notes" aria-hidden="true" />
      <header className="topbar">
        <div className="logo">
          <span className="logo-disc" aria-hidden="true" />
          GUESS<span className="logo-accent">IFY</span>
        </div>
        {status === "loggedIn" && (
          <div className="user-chip">
            {me?.image && <img src={me.image} alt="" className="user-avatar" />}
            <span className="user-name">{me?.displayName || "you"}</span>
            <button className="btn btn-mini" onClick={logout}>
              log out
            </button>
          </div>
        )}
      </header>

      <main className="stage">
        {status === "checking" && <div className="loader">spinning up…</div>}

        {status === "loggedOut" && <Login error={authError} />}

        {status === "loggedIn" && !playlist && (
          <PlaylistPicker onPick={setPlaylist} />
        )}

        {status === "loggedIn" && playlist && (
          <Game playlist={playlist} onExit={() => setPlaylist(null)} />
        )}
      </main>

      <footer className="footer">
        made for fun · not affiliated with Spotify
      </footer>
    </div>
  );
}
