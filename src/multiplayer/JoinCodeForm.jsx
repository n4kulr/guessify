import { useState } from "react";

/** Enter a 6-char room code → navigate to /join/CODE (no Spotify needed). */
export default function JoinCodeForm({ compact = false }) {
  const [code, setCode] = useState("");

  function go(e) {
    e?.preventDefault();
    const cleaned = code.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
    if (cleaned.length < 4) return;
    window.location.href = `/join/${cleaned}`;
  }

  return (
    <form className={`join-code-form ${compact ? "join-code-form--compact" : ""}`} onSubmit={go}>
      {!compact && <p className="join-code-label">Got a party code?</p>}
      <div className="join-code-row">
        <input
          className="guess-input join-code-input"
          placeholder="enter code…"
          value={code}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button className="btn btn-play" type="submit" disabled={code.replace(/[^a-z0-9]/gi, "").length < 4}>
          join
        </button>
      </div>
    </form>
  );
}
