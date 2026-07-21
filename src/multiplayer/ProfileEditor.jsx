import { useEffect, useState } from "react";
import PlayerAvatar from "./PlayerAvatar.jsx";
import {
  PLAYER_COLORS,
  AVATAR_EYES,
  AVATAR_MOUTHS,
  randomAvatar,
  normalizeAvatar,
} from "./constants.js";

/**
 * Skribbl-style nickname + face customizer.
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

  // Sync if parent resets (e.g. after rejoin loads profile).
  useEffect(() => {
    if (nameProp && nameProp !== name) setName(nameProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameProp]);

  useEffect(() => {
    if (avatarProp) setAvatar(normalizeAvatar(avatarProp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarProp?.color, avatarProp?.eyes, avatarProp?.mouth]);

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
        <PlayerAvatar avatar={avatar} size={88} />
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
        <span className="profile-label">color</span>
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
        <span className="profile-label">eyes</span>
        <div className="profile-parts">
          {Array.from({ length: AVATAR_EYES }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`profile-part ${avatar.eyes === i ? "active" : ""}`}
              onClick={() => patchAvatar({ eyes: i })}
            >
              <PlayerAvatar avatar={{ ...avatar, eyes: i }} size={36} />
            </button>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <span className="profile-label">mouth</span>
        <div className="profile-parts">
          {Array.from({ length: AVATAR_MOUTHS }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`profile-part ${avatar.mouth === i ? "active" : ""}`}
              onClick={() => patchAvatar({ mouth: i })}
            >
              <PlayerAvatar avatar={{ ...avatar, mouth: i }} size={36} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
