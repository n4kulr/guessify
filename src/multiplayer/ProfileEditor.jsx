import { useEffect, useState } from "react";
import PlayerAvatar from "./PlayerAvatar.jsx";
import {
  PLAYER_COLORS,
  PEEP_COUNT,
  randomAvatar,
  normalizeAvatar,
} from "./constants.js";

/**
 * Nickname + Open Peeps bust picker (from Flat Assets library).
 * Calls onChange({ name, avatar }) whenever something updates.
 */
export default function ProfileEditor({
  name: nameProp = "",
  avatar: avatarProp,
  onChange,
  showRandom = true,
}) {
  const [name, setName] = useState(nameProp);
  const [avatar, setAvatar] = useState(() =>
    normalizeAvatar(avatarProp || randomAvatar())
  );

  useEffect(() => {
    if (nameProp && nameProp !== name) setName(nameProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameProp]);

  useEffect(() => {
    if (avatarProp) setAvatar(normalizeAvatar(avatarProp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarProp?.peep, avatarProp?.color]);

  function emit(nextName, nextAvatar) {
    onChange?.({
      name: nextName,
      avatar: normalizeAvatar(nextAvatar),
    });
  }

  function patchAvatar(partial) {
    const next = normalizeAvatar({ ...avatar, ...partial });
    setAvatar(next);
    emit(name, next);
  }

  function onName(v) {
    setName(v);
    emit(v, avatar);
  }

  function randomize() {
    const next = randomAvatar();
    setAvatar(next);
    emit(name, next);
  }

  return (
    <div className="profile-editor">
      <div className="profile-preview">
        <PlayerAvatar avatar={avatar} size={96} />
        {showRandom && (
          <button type="button" className="btn btn-mini" onClick={randomize}>
            randomize
          </button>
        )}
      </div>

      <input
        className="guess-input"
        placeholder="nickname…"
        value={name}
        maxLength={16}
        onChange={(e) => onName(e.target.value)}
      />

      <div className="profile-section">
        <span className="profile-label">accent</span>
        <div className="profile-swatches">
          {PLAYER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`profile-swatch ${avatar.color === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => patchAvatar({ color: c })}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="profile-section">
        <span className="profile-label">peep</span>
        <div className="profile-peeps">
          {Array.from({ length: PEEP_COUNT }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`profile-part ${avatar.peep === n ? "active" : ""}`}
              onClick={() => patchAvatar({ peep: n })}
              aria-label={`peep ${n}`}
            >
              <PlayerAvatar avatar={{ peep: n, color: avatar.color }} size={48} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
