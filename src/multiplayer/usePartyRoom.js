import { useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";

function partyHost() {
  // Local: partykit dev defaults to 127.0.0.1:1999
  // Prod: set VITE_PARTYKIT_HOST to something like "guessify.nakul.partykit.dev"
  return import.meta.env.VITE_PARTYKIT_HOST || "127.0.0.1:1999";
}

export function usePartyRoom(code, { enabled = true } = {}) {
  const [state, setState] = useState(null);
  const [role, setRole] = useState(null); // host | guest
  const [playerId, setPlayerId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled || !code) return;

    setStatus("connecting");
    setError(null);

    const socket = new PartySocket({
      host: partyHost(),
      room: code.toUpperCase(),
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => setStatus("connected"));
    socket.addEventListener("close", () => setStatus("idle"));
    socket.addEventListener("error", () => {
      setStatus("error");
      setError("Couldn't reach the multiplayer server.");
    });
    socket.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "state") setState(msg.state);
      if (msg.type === "hosted") setRole("host");
      if (msg.type === "joined") {
        setRole("guest");
        setPlayerId(msg.playerId);
        try {
          sessionStorage.setItem(
            `guessify-mp-${code.toUpperCase()}`,
            msg.playerId
          );
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
