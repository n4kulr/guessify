import { useEffect, useRef, useState } from "react";
import { getToken, clearTokenCache } from "./spotify.js";

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";

// Loads the Spotify Web Playback SDK and connects a browser "device" we can
// stream full tracks to. Requires Spotify Premium.
export function useSpotifyPlayer() {
  const [deviceId, setDeviceId] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function init() {
      const player = new window.Spotify.Player({
        name: "Guessify 🎧",
        getOAuthToken: (cb) => {
          clearTokenCache();
          getToken()
            .then(cb)
            .catch(() => {
              if (!cancelled) {
                setErrorMsg("Login expired — log out and back in.");
                setStatus("error");
              }
            });
        },
        volume: 0.8,
      });
      playerRef.current = player;

      player.addListener("ready", ({ device_id }) => {
        if (cancelled) return;
        setDeviceId(device_id);
        setStatus("ready");
      });
      player.addListener("not_ready", () => {
        if (!cancelled) setDeviceId(null);
      });
      player.addListener("initialization_error", ({ message }) => {
        if (cancelled) return;
        setErrorMsg(message || "Your browser can't run the Spotify player.");
        setStatus("error");
      });
      player.addListener("authentication_error", () => {
        if (cancelled) return;
        setErrorMsg("Spotify login expired — log out and back in.");
        setStatus("error");
      });
      player.addListener("account_error", () => {
        if (cancelled) return;
        setErrorMsg("Spotify Premium is required to stream tracks.");
        setStatus("error");
      });

      player.connect();
    }

    if (window.Spotify) {
      init();
    } else {
      window.onSpotifyWebPlaybackSDKReady = init;
      if (!document.getElementById("spotify-sdk")) {
        const s = document.createElement("script");
        s.id = "spotify-sdk";
        s.src = SDK_SRC;
        s.async = true;
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, []);

  return { deviceId, status, errorMsg, player: playerRef };
}
