import { useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";

function partyHost() {
  // Local: `npm run dev:party` (wrangler) defaults to 127.0.0.1:8787
  // Prod: set VITE_PARTYKIT_HOST to your workers.dev host (no https://)
  return import.meta.env.VITE_PARTYKIT_HOST || "127.0.0.1:8787";
}

function playerKey(code) {
  return `guessify-mp-${String(code).toUpperCase()}`;
}

export function usePartyRoom(code, { enabled = true } = {}) {
  const [state, setState] = useState(null);
  const [role, setRole] = useState(null); // host | guest
  const [playerId, setPlayerId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const retriesRef = useRef(0);

  useEffect(() => {
    if (!enabled || !code) return;

    setStatus("connecting");
    setError(null);
    retriesRef.current = 0;

    const socket = new PartySocket({
      host: partyHost(),
      party: "main",
      room: code.toUpperCase(),
      // Stay patient when someone backgrounds the app for a while.
      maxRetries: 40,
      connectionTimeout: 20000,
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 30000,
      reconnectionDelayGrowFactor: 1.4,
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      retriesRef.current = 0;
      setStatus("connected");
      setError(null);
    });
    socket.addEventListener("close", () => {
      // PartySocket will keep retrying; surface reconnecting instead of a hard fail.
      setStatus("connecting");
    });
    socket.addEventListener("error", () => {
      retriesRef.current += 1;
      if (retriesRef.current >= 40) {
        setStatus("error");
        setError("Couldn't reach the multiplayer server.");
      } else {
        setStatus("connecting");
      }
    });
    socket.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "state") setState(msg.state);
      if (msg.type === "hosted") {
        setRole("host");
        if (msg.playerId) {
          setPlayerId(msg.playerId);
          try {
            sessionStorage.setItem(playerKey(code), msg.playerId);
          } catch {
            /* ignore */
          }
        }
      }
      if (msg.type === "joined") {
        setRole("guest");
        setPlayerId(msg.playerId);
        try {
          sessionStorage.setItem(playerKey(code), msg.playerId);
        } catch {
          /* ignore */
        }
      }
      if (msg.type === "error") setError(msg.error);
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [code, enabled]);

  function send(msg) {
    const s = socketRef.current;
    if (!s || s.readyState !== WebSocket.OPEN) return;
    s.send(JSON.stringify(msg));
  }

  return { state, role, playerId, status, error, setError, send };
}
