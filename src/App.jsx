import { useEffect, useRef, useState } from "react";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import PlaylistPicker from "./components/PlaylistPicker.jsx";
import Game from "./components/Game.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import VolumeControl from "./components/VolumeControl.jsx";
import FabDock from "./components/FabDock.jsx";
import UserMenu from "./components/UserMenu.jsx";
import HostParty from "./multiplayer/HostParty.jsx";
import GuestApp from "./multiplayer/GuestApp.jsx";
import OnlineRace from "./components/OnlineRace.jsx";
import OnlineJoinDialog from "./components/OnlineJoinDialog.jsx";
import PlayHowto, {
  hasSeenPlayHowto,
  markPlayHowtoSeen,
} from "./components/PlayHowto.jsx";
import { makeRoomCode } from "./multiplayer/constants.js";
import { loadLocalProfile, saveLocalProfile } from "./localProfile.js";
import { loadTheme, DEFAULT_THEME } from "./themes.js";
import { attachKeyboardSounds } from "./keyboardSounds.js";

function joinCodeFromPath() {
  const m = window.location.pathname.match(/^\/join\/([A-Za-z0-9]+)/i);
  return m ? m[1].toUpperCase() : null;
}

function pathFor(step, mode, roomCode) {
  if (step === "pick") return mode === "multi" ? "/pick/multi" : "/pick";
  if (step === "play") return "/play";
  if (step === "host") return roomCode ? `/host/${roomCode}` : "/host";
  if (step === "online" || step === "online-prompt") return "/online";
  if (step === "howto") return `/howto/${mode || "solo"}`;
  return "/";
}

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | loggedOut | loggedIn | guest
  const [me, setMe] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [picking, setPicking] = useState(false);
  const [mode, setMode] = useState("solo"); // solo | multi | online
  const [roomCode, setRoomCode] = useState(null);
  const [joinCode] = useState(() => joinCodeFromPath());
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [homeNonce, setHomeNonce] = useState(0);
  const [onlinePrompt, setOnlinePrompt] = useState(false);
  const [onlineProfile, setOnlineProfile] = useState(null);
  const [howtoMode, setHowtoMode] = useState(null); // null | solo | multi | online

  const howtoRef = useRef(howtoMode);
  const onlinePromptRef = useRef(onlinePrompt);
  const playlistRef = useRef(playlist);
  const onlineProfileRef = useRef(onlineProfile);
  howtoRef.current = howtoMode;
  onlinePromptRef.current = onlinePrompt;
  playlistRef.current = playlist;
  onlineProfileRef.current = onlineProfile;

  function pushNav(step, nextMode = "solo", code = null) {
    window.history.pushState(
      { step, mode: nextMode, roomCode: code },
      "",
      pathFor(step, nextMode, code)
    );
  }

  function replaceNav(step, nextMode = "solo", code = null) {
    window.history.replaceState(
      { step, mode: nextMode, roomCode: code },
      "",
      pathFor(step, nextMode, code)
    );
  }

  function resetToHomeUi() {
    setPlaylist(null);
    setPicking(false);
    setRoomCode(null);
    setMode("solo");
    setOnlinePrompt(false);
    setOnlineProfile(null);
    setHowtoMode(null);
    setHomeNonce((n) => n + 1);
  }

  function applyHistory(entry) {
    const step = entry?.step || "home";
    const nextMode = entry?.mode || "solo";

    setHowtoMode(null);
    setOnlinePrompt(false);

    if (step === "howto") {
      setHowtoMode(nextMode);
      return;
    }
    if (step === "online-prompt") {
      setMode("online");
      setPicking(false);
      setPlaylist(null);
      setRoomCode(null);
      setOnlineProfile(null);
      setOnlinePrompt(true);
      return;
    }
    if (step === "pick") {
      setPlaylist(null);
      setPicking(true);
      setRoomCode(null);
      setOnlineProfile(null);
      setMode(nextMode === "multi" ? "multi" : "solo");
      setHomeNonce((n) => n + 1);
      return;
    }
    if (step === "play") {
      if (!playlistRef.current) {
        setPicking(true);
        setMode("solo");
        setPlaylist(null);
        setRoomCode(null);
        setOnlineProfile(null);
        replaceNav("pick", "solo");
        return;
      }
      setPicking(false);
      setMode("solo");
      setRoomCode(null);
      setOnlineProfile(null);
      return;
    }
    if (step === "host") {
      if (!playlistRef.current) {
        setPicking(true);
        setMode("multi");
        setPlaylist(null);
        setRoomCode(null);
        setOnlineProfile(null);
        replaceNav("pick", "multi");
        return;
      }
      setPicking(false);
      setMode("multi");
      setOnlineProfile(null);
      if (entry?.roomCode) setRoomCode(entry.roomCode);
      return;
    }
    if (step === "online") {
      if (!onlineProfileRef.current) {
        resetToHomeUi();
        replaceNav("home");
        return;
      }
      setPicking(false);
      setPlaylist(null);
      setRoomCode(null);
      setMode("online");
      return;
    }

    resetToHomeUi();
  }

  useEffect(() => attachKeyboardSounds(), []);

  useEffect(() => {
    function onAccentTheme(e) {
      const key = e.detail?.key;
      if (key) setTheme(key);
    }
    window.addEventListener("guessify:theme-from-accent", onAccentTheme);
    return () =>
      window.removeEventListener("guessify:theme-from-accent", onAccentTheme);
  }, []);

  useEffect(() => {
    setTheme(loadTheme());
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setAuthError(params.get("error"));
      window.history.replaceState({ step: "home" }, "", "/");
    } else if (!joinCode) {
      // Seed so the first in-app push has a home entry to return to.
      const existing = window.history.state;
      if (!existing?.step) {
        window.history.replaceState({ step: "home" }, "", "/");
      }
    }
    if (joinCode) {
      setStatus("guest");
      return;
    }
    checkMe();
  }, [joinCode]);

  useEffect(() => {
    if (joinCode) return;

    function onPop(e) {
      // Dismiss overlays first if somehow still open without a matching entry.
      if (howtoRef.current && e.state?.step !== "howto") {
        setHowtoMode(null);
      }
      applyHistory(e.state);
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  async function checkMe() {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.ok) {
        const user = await res.json();
        setMe(user);
        setStatus("loggedIn");
        // Spotify nickname wins over the locally saved online name.
        const first = user.displayName?.split(/\s+/)[0]?.trim().slice(0, 16);
        if (first) {
          const local = loadLocalProfile();
          saveLocalProfile({ name: first, avatar: local.avatar });
        }
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
    resetToHomeUi();
    setStatus("loggedOut");
    replaceNav("home");
  }

  function goHome() {
    if (joinCode) {
      window.location.href = "/";
      return;
    }
    resetToHomeUi();
    replaceNav("home");
  }

  function leaveGame() {
    setPlaylist(null);
    setPicking(true);
    setMode("solo");
    setRoomCode(null);
    setOnlinePrompt(false);
    setOnlineProfile(null);
    setHomeNonce((n) => n + 1);
    // Replace /play so Back from picker returns home, not an empty game.
    replaceNav("pick", "solo");
  }

  function beginSolo() {
    setMode("solo");
    setPicking(true);
    setPlaylist(null);
    setRoomCode(null);
    setOnlineProfile(null);
    pushNav("pick", "solo");
  }

  function beginMulti() {
    setMode("multi");
    setPicking(true);
    setPlaylist(null);
    setRoomCode(null);
    setOnlineProfile(null);
    pushNav("pick", "multi");
  }

  function beginOnline() {
    setOnlinePrompt(true);
    pushNav("online-prompt", "online");
  }

  function withHowto(nextMode, next) {
    if (hasSeenPlayHowto()) {
      next();
      return;
    }
    setHowtoMode(nextMode);
    pushNav("howto", nextMode);
  }

  function startSolo() {
    withHowto("solo", beginSolo);
  }

  function startMulti() {
    withHowto("multi", beginMulti);
  }

  function startOnline() {
    withHowto("online", beginOnline);
  }

  function finishHowto() {
    const next = howtoMode;
    markPlayHowtoSeen();
    setHowtoMode(null);
    // Replace howto entry with the real next screen.
    if (next === "solo") {
      setMode("solo");
      setPicking(true);
      setPlaylist(null);
      replaceNav("pick", "solo");
    } else if (next === "multi") {
      setMode("multi");
      setPicking(true);
      setPlaylist(null);
      replaceNav("pick", "multi");
    } else if (next === "online") {
      setOnlinePrompt(true);
      replaceNav("online-prompt", "online");
    }
  }

  function confirmOnline(profile) {
    setOnlineProfile(profile);
    setOnlinePrompt(false);
    setMode("online");
    setPicking(false);
    setPlaylist(null);
    setRoomCode(null);
    replaceNav("online", "online");
  }

  function cancelOnlinePrompt() {
    setOnlinePrompt(false);
    // Prefer stepping back to home entry if we pushed online-prompt.
    if (window.history.state?.step === "online-prompt") {
      window.history.back();
      return;
    }
    resetToHomeUi();
    replaceNav("home");
  }

  function onPlaylistPicked(pl) {
    setPlaylist(pl);
    setPicking(false);
    if (mode === "multi") {
      const code = makeRoomCode();
      setRoomCode(code);
      pushNav("host", "multi", code);
    } else {
      setRoomCode(null);
      pushNav("play", "solo");
    }
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
          <VolumeControl />
          <ThemeSwitcher current={theme} onChange={setTheme} />
          {status === "loggedIn" && <UserMenu me={me} onLogout={logout} />}
        </div>
      </header>

      <main className="stage">
        {status === "checking" && <div className="loader">loading…</div>}

        {status === "guest" && joinCode && <GuestApp code={joinCode} />}

        {status === "loggedOut" &&
          !joinCode &&
          !picking &&
          !playlist &&
          mode !== "online" && (
          <Login
            error={authError}
            onStartSolo={startSolo}
            onStartMulti={startMulti}
            onStartOnline={startOnline}
          />
        )}

        {status === "loggedIn" && !playlist && !picking && mode !== "online" && (
          <Home
            me={me}
            onStartSolo={startSolo}
            onStartMulti={startMulti}
            onStartOnline={startOnline}
          />
        )}

        {(status === "loggedIn" || status === "loggedOut") && picking && (
          <PlaylistPicker
            key={homeNonce}
            onPick={onPlaylistPicked}
            needsLogin={status === "loggedOut"}
          />
        )}

        {(status === "loggedIn" || status === "loggedOut") &&
          mode === "solo" &&
          playlist && <Game playlist={playlist} me={me} onExit={leaveGame} />}

        {(status === "loggedIn" || status === "loggedOut") &&
          mode === "multi" &&
          playlist &&
          roomCode && (
            <HostParty code={roomCode} playlist={playlist} me={me} onExit={goHome} />
          )}

        {(status === "loggedIn" || status === "loggedOut") &&
          mode === "online" &&
          onlineProfile && <OnlineRace profile={onlineProfile} onExit={goHome} />}
      </main>

      {howtoMode && (
        <PlayHowto mode={howtoMode} onDone={finishHowto} />
      )}

      {onlinePrompt && (
        <OnlineJoinDialog
          me={me}
          onJoin={confirmOnline}
          onCancel={cancelOnlinePrompt}
        />
      )}

      <footer className="footer">
        made with <span className="footer-heart" aria-hidden="true">♥</span> by nakul
      </footer>

      <FabDock />
    </div>
  );
}
