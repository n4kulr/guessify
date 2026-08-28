import { useEffect, useMemo, useRef, useState } from "react";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import PlaylistPicker from "./components/PlaylistPicker.jsx";
import Game from "./components/Game.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import LookButton from "./components/LookButton.jsx";
import VolumeControl from "./components/VolumeControl.jsx";
import FabDock from "./components/FabDock.jsx";
import UserMenu from "./components/UserMenu.jsx";
import HostParty from "./multiplayer/HostParty.jsx";
import GuestApp from "./multiplayer/GuestApp.jsx";
import OnlineRace from "./components/OnlineRace.jsx";
import DebugPanel from "./components/DebugPanel.jsx";
import { isFastTest } from "./fastTest.js";
import { useDebugActions } from "./debugRegistry.js";
import OnlineJoinDialog from "./components/OnlineJoinDialog.jsx";
import PrivacyDialog from "./components/PrivacyDialog.jsx";
import VersionHistoryDialog from "./components/VersionHistoryDialog.jsx";
import RaceModeDialog from "./components/RaceModeDialog.jsx";
import PlayHowto, {
  hasSeenPlayHowto,
  markPlayHowtoSeen,
  markPickerTourPending,
  HOWTO_KEY,
  PICKER_TOUR_KEY,
} from "./components/PlayHowto.jsx";
import { makeRoomCode, normalizeRaceMode } from "./multiplayer/constants.js";
import { loadLocalProfile, saveLocalProfile, hasSavedLocalProfile } from "./localProfile.js";
import { loadTheme, DEFAULT_THEME, currentThemeMode } from "./themes.js";
import { attachKeyboardSounds } from "./keyboardSounds.js";
import { attachButtonSounds } from "./buttonSounds.js";
import { primePlaylistPreviews } from "./previewWarm.js";
import { ROUND_COUNT } from "./multiplayer/constants.js";

function joinCodeFromPath() {
  const m = window.location.pathname.match(/^\/join\/([A-Za-z0-9]+)/i);
  return m ? m[1].toUpperCase() : null;
}

const HOME_TITLE = "Guessify — Guess the song from a short clip";

function syncSeo() {
  const home = (window.location.pathname.replace(/\/+$/, "") || "/") === "/";
  document.title = home ? HOME_TITLE : "Guessify";
  let el = document.querySelector('meta[name="robots"]');
  if (!el) {
    el = document.createElement("meta");
    el.name = "robots";
    document.head.appendChild(el);
  }
  el.content = home ? "index, follow" : "noindex, follow";
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
  const [gameKey, setGameKey] = useState(0);
  const [picking, setPicking] = useState(false);
  const [mode, setMode] = useState("solo"); // solo | multi | online
  const [roomCode, setRoomCode] = useState(null);
  const [joinCode] = useState(() => joinCodeFromPath());
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeMode, setThemeMode] = useState("dark");
  const [homeNonce, setHomeNonce] = useState(0);
  const [onlinePrompt, setOnlinePrompt] = useState(false);
  const [onlineProfile, setOnlineProfile] = useState(null);
  const [hostPrompt, setHostPrompt] = useState(false);
  const [hostProfile, setHostProfile] = useState(null);
  const [howtoMode, setHowtoMode] = useState(null); // null | solo | multi | online
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [raceModePrompt, setRaceModePrompt] = useState(null); // null | "online"
  const [raceMode, setRaceMode] = useState("classic"); // classic | timed
  // Capture ?fast=1 before history seeding strips the query.
  useRef(isFastTest());

  const howtoRef = useRef(howtoMode);
  const onlinePromptRef = useRef(onlinePrompt);
  const hostPromptRef = useRef(hostPrompt);
  const playlistRef = useRef(playlist);
  const onlineProfileRef = useRef(onlineProfile);
  howtoRef.current = howtoMode;
  onlinePromptRef.current = onlinePrompt;
  hostPromptRef.current = hostPrompt;
  playlistRef.current = playlist;
  onlineProfileRef.current = onlineProfile;

  function pushNav(step, nextMode = "solo", code = null) {
    window.history.pushState(
      { step, mode: nextMode, roomCode: code },
      "",
      pathFor(step, nextMode, code)
    );
    syncSeo();
  }

  function replaceNav(step, nextMode = "solo", code = null) {
    window.history.replaceState(
      { step, mode: nextMode, roomCode: code },
      "",
      pathFor(step, nextMode, code)
    );
    syncSeo();
  }

  function resetToHomeUi() {
    setPlaylist(null);
    setPicking(false);
    setRoomCode(null);
    setMode("solo");
    setOnlinePrompt(false);
    setOnlineProfile(null);
    setHostPrompt(false);
    setHostProfile(null);
    setHowtoMode(null);
    setRaceModePrompt(null);
    setRaceMode("classic");
    setHomeNonce((n) => n + 1);
  }

  function applyHistory(entry) {
    const step = entry?.step || "home";
    const nextMode = entry?.mode || "solo";

    setHowtoMode(null);
    setOnlinePrompt(false);
    setHostPrompt(false);

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
      setHostProfile(null);
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
        setHostProfile(null);
        replaceNav("pick", "multi");
        return;
      }
      setPicking(false);
      setMode("multi");
      setOnlineProfile(null);
      if (entry?.roomCode) setRoomCode(entry.roomCode);
      if (!hostProfile && hasSavedLocalProfile()) {
        setHostProfile(loadLocalProfile());
      }
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
  useEffect(() => attachButtonSounds(), []);

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
    setThemeMode(currentThemeMode());
    // Keep sticky flag even if we rewrite the path below.
    isFastTest();
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setAuthError(params.get("error"));
      window.history.replaceState(
        { step: "home" },
        "",
        isFastTest() ? "/?fast=1" : "/"
      );
    } else if (!joinCode) {
      // Seed so the first in-app push has a home entry to return to.
      const existing = window.history.state;
      if (!existing?.step) {
        window.history.replaceState(
          { step: "home" },
          "",
          isFastTest() ? "/?fast=1" : "/"
        );
      }
    }
    if (joinCode) {
      setStatus("guest");
      return;
    }
    checkMe();
  }, [joinCode]);

  useEffect(() => {
    syncSeo();
  }, [joinCode]);

  useEffect(() => {
    if (joinCode) return;

    function onPop(e) {
      // Dismiss overlays first if somehow still open without a matching entry.
      if (howtoRef.current && e.state?.step !== "howto") {
        setHowtoMode(null);
      }
      applyHistory(e.state);
      syncSeo();
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
    setHostPrompt(false);
    setHostProfile(null);
    setHomeNonce((n) => n + 1);
    // Replace /play so Back from picker returns home, not an empty game.
    replaceNav("pick", "solo");
  }

  /** Same playlist, new shuffle — remount solo Game. */
  function rematchSolo() {
    setGameKey((k) => k + 1);
  }

  function beginSolo() {
    setMode("solo");
    setPicking(true);
    setPlaylist(null);
    setRoomCode(null);
    setOnlineProfile(null);
    setHostPrompt(false);
    setHostProfile(null);
    pushNav("pick", "solo");
  }

  function beginMulti() {
    setMode("multi");
    setPicking(true);
    setPlaylist(null);
    setRoomCode(null);
    setOnlineProfile(null);
    setHostPrompt(false);
    setHostProfile(null);
    setRaceMode("classic");
    pushNav("pick", "multi");
  }

  function beginOnline() {
    setRaceModePrompt("online");
  }

  function confirmRaceMode(mode) {
    setRaceMode(normalizeRaceMode(mode));
    setRaceModePrompt(null);
    setOnlinePrompt(true);
    pushNav("online-prompt", "online");
  }

  function cancelRaceMode() {
    setRaceModePrompt(null);
    if (window.history.state?.step === "howto") {
      window.history.back();
      return;
    }
    resetToHomeUi();
    replaceNav("home");
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
    markPickerTourPending();
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
      setRaceMode("classic");
      replaceNav("pick", "multi");
    } else if (next === "online") {
      setRaceModePrompt("online");
      replaceNav("home");
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

  function confirmHostProfile(profile) {
    setHostProfile(profile);
    setHostPrompt(false);
    pushNav("host", "multi", roomCode);
  }

  function cancelHostPrompt() {
    setHostPrompt(false);
    setHostProfile(null);
    setPlaylist(null);
    setRoomCode(null);
    setPicking(true);
    replaceNav("pick", "multi");
  }

  function onPlaylistPicked(pl) {
    // Warm iTunes + MP3 cache while we navigate; Game still gates until its
    // shuffled round-1 track is actually ready.
    void primePlaylistPreviews(pl?.tracks, ROUND_COUNT + 4);
    setPlaylist(pl);
    setPicking(false);
    if (mode === "multi") {
      const code = makeRoomCode();
      setRoomCode(code);
      // Same customize sheet as quickplay — skip if they already saved one.
      if (hasSavedLocalProfile()) {
        setHostProfile(loadLocalProfile());
        setHostPrompt(false);
        pushNav("host", "multi", code);
      } else {
        setHostProfile(null);
        setHostPrompt(true);
      }
    } else {
      setRoomCode(null);
      pushNav("play", "solo");
    }
  }

  // Landing already has a hero brand — hide the duplicate top-left logo there.
  const onLanding =
    !joinCode &&
    !picking &&
    !playlist &&
    !onlineProfile &&
    mode !== "online" &&
    (status === "loggedIn" || status === "loggedOut");

  const debugScreen = joinCode
    ? "guest"
    : howtoMode
      ? `howto:${howtoMode}`
      : onlinePrompt
        ? "online-prompt"
        : hostPrompt
          ? "host-prompt"
          : mode === "online" && onlineProfile
            ? "online-race"
            : mode === "multi" && playlist && roomCode
              ? "host-party"
              : mode === "solo" && playlist
                ? "solo"
                : picking
                  ? `picker:${mode}`
                  : onLanding
                    ? status === "loggedIn"
                      ? "home"
                      : "login"
                    : "app";

  const debugActions = useMemo(() => {
    /** Shell-level only — game screens register their own actions. */
    if (
      debugScreen === "solo" ||
      debugScreen === "online-race" ||
      debugScreen === "host-party" ||
      debugScreen === "guest"
    ) {
      return null;
    }
    const acts = [];
    if (debugScreen === "home" || debugScreen === "login") {
      acts.push(
        { id: "solo", label: "start solo picker", run: () => beginSolo() },
        { id: "multi", label: "start host picker", run: () => beginMulti() },
        { id: "online", label: "open quick play prompt", run: () => startOnline() },
        {
          id: "howto-solo",
          label: "show howto (solo)",
          run: () => setHowtoMode("solo"),
        },
        {
          id: "clear-howto",
          label: "reset howto seen flag",
          run: () => {
            try {
              localStorage.removeItem(HOWTO_KEY);
              localStorage.removeItem(PICKER_TOUR_KEY);
            } catch {
              /* ignore */
            }
          },
        }
      );
    }
    if (debugScreen.startsWith("picker:")) {
      acts.push({
        id: "home",
        label: "back home",
        run: () => goHome(),
      });
    }
    if (debugScreen === "online-prompt" || debugScreen === "host-prompt") {
      acts.push({
        id: "cancel-prompt",
        label: "close prompt",
        run: () =>
          debugScreen === "online-prompt"
            ? cancelOnlinePrompt()
            : cancelHostPrompt(),
      });
    }
    if (debugScreen.startsWith("howto:")) {
      acts.push({
        id: "finish-howto",
        label: "finish howto",
        run: () => finishHowto(),
      });
    }
    acts.push({
      id: "off",
      label: "turn off fast mode",
      run: () => {
        try {
          sessionStorage.removeItem("guessify-fast");
        } catch {
          /* ignore */
        }
        window.location.href = "/?fast=0";
      },
    });
    return acts;
  }, [debugScreen]); // eslint-disable-line react-hooks/exhaustive-deps

  useDebugActions(
    debugActions == null ? null : debugScreen,
    debugActions || []
  );

  return (
    <div className="app">
      <header className={`topbar${onLanding ? " topbar--landing" : ""}`}>
        <button className="logo" onClick={goHome} title="home">
          <span className="logo-disc" aria-hidden="true" />
          <span className="logo-word">
            guess<span className="logo-accent">ify</span>
          </span>
        </button>

        <div className="topbar-right">
          <VolumeControl />
          <ThemeSwitcher
            current={theme}
            mode={themeMode}
            onChange={setTheme}
            onModeChange={setThemeMode}
          />
          <LookButton
            theme={theme}
            themeMode={themeMode}
            onTheme={setTheme}
            onThemeMode={setThemeMode}
          />
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
          playlist && (
            <Game
              key={gameKey}
              playlist={playlist}
              me={me}
              onExit={leaveGame}
              onReplay={rematchSolo}
            />
          )}

        {(status === "loggedIn" || status === "loggedOut") &&
          mode === "multi" &&
          playlist &&
          roomCode &&
          !hostPrompt && (
            <HostParty
              code={roomCode}
              playlist={playlist}
              me={me}
              profile={hostProfile}
              raceMode={raceMode}
              onExit={goHome}
            />
          )}

        {(status === "loggedIn" || status === "loggedOut") &&
          mode === "online" &&
          onlineProfile && (
            <OnlineRace
              profile={onlineProfile}
              raceMode={raceMode}
              onExit={goHome}
            />
          )}
      </main>

      {howtoMode && (
        <PlayHowto
          mode={howtoMode}
          onDone={finishHowto}
          onPrivacy={() => setPrivacyOpen(true)}
          onVersion={() => setVersionOpen(true)}
        />
      )}

      {raceModePrompt && (
        <RaceModeDialog
          onPick={confirmRaceMode}
          onCancel={cancelRaceMode}
        />
      )}

      {onlinePrompt && (
        <OnlineJoinDialog
          me={me}
          onJoin={confirmOnline}
          onCancel={cancelOnlinePrompt}
        />
      )}

      {hostPrompt && (
        <OnlineJoinDialog
          me={me}
          title="host party"
          hint="pick a name - and customize!"
          submitLabel="open lobby"
          onJoin={confirmHostProfile}
          onCancel={cancelHostPrompt}
        />
      )}

      <footer className="footer">
        made with <span className="footer-heart" aria-hidden="true">♥</span> by{" "}
        <a
          className="footer-credit"
          href="https://portfolio-blond-eta-95.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          nakul
        </a>
      </footer>

      {privacyOpen && (
        <PrivacyDialog onClose={() => setPrivacyOpen(false)} />
      )}

      {versionOpen && (
        <VersionHistoryDialog onClose={() => setVersionOpen(false)} />
      )}

      <FabDock
        onPrivacy={() => setPrivacyOpen(true)}
        onVersion={() => setVersionOpen(true)}
      />
      <DebugPanel />
    </div>
  );
}
