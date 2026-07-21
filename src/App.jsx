import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import PlaylistPicker from "./components/PlaylistPicker.jsx";
import Game from "./components/Game.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import HowToPlay from "./components/HowToPlay.jsx";
import HostParty from "./multiplayer/HostParty.jsx";
import GuestApp from "./multiplayer/GuestApp.jsx";
import { makeRoomCode } from "./multiplayer/constants.js";
import { loadTheme } from "./themes.js";

function joinCodeFromPath() {
  const m = window.location.pathname.match(/^\/join\/([A-Za-z0-9]+)/i);
  return m ? m[1].toUpperCase() : null;
}

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | loggedOut | loggedIn | guest
  const [me, setMe] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [picking, setPicking] = useState(false);
  const [mode, setMode] = useState("solo"); // solo | multi
  const [roomCode, setRoomCode] = useState(null);
  const [joinCode] = useState(() => joinCodeFromPath());
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState("serika_dark");
  const [homeNonce, setHomeNonce] = useState(0);

  useEffect(() => {
    setTheme(loadTheme());
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setAuthError(params.get("error"));
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (joinCode) {
      setStatus("guest");
      return;
    }
    checkMe();
  }, [joinCode]);

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
    setRoomCode(null);
    setMode("solo");
    setStatus("loggedOut");
  }

  function goHome() {
    if (joinCode) {
      window.location.href = "/";
      return;
    }
    setPlaylist(null);
    setPicking(false);
    setRoomCode(null);
    setMode("solo");
    setHomeNonce((n) => n + 1);
  }

  function leaveGame() {
    setPlaylist(null);
    setPicking(true);
    setMode("solo");
    setRoomCode(null);
    setHomeNonce((n) => n + 1);
  }

  function startSolo() {
    setMode("solo");
    setPicking(true);
  }

  function startMulti() {
    setMode("multi");
    setPicking(true);
  }

  function onPlaylistPicked(pl) {
    setPlaylist(pl);
    setPicking(false);
    if (mode === "multi") setRoomCode(makeRoomCode());
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

        {status === "guest" && joinCode && <GuestApp code={joinCode} />}

        {status === "loggedOut" && !joinCode && <Login error={authError} />}

        {status === "loggedIn" && !playlist && !picking && (
          <Home me={me} onStartSolo={startSolo} onStartMulti={startMulti} />
        )}

        {status === "loggedIn" && picking && (
          <PlaylistPicker key={homeNonce} onPick={onPlaylistPicked} onBack={goHome} />
        )}

        {status === "loggedIn" && mode === "solo" && playlist && (
          <Game playlist={playlist} onExit={leaveGame} />
        )}

        {status === "loggedIn" && mode === "multi" && playlist && roomCode && (
          <HostParty code={roomCode} playlist={playlist} me={me} onExit={goHome} />
        )}
      </main>

      <footer className="footer">
        made with <span className="footer-heart" aria-hidden="true">♥</span> by nakul
      </footer>

      <HowToPlay />
    </div>
  );
}
