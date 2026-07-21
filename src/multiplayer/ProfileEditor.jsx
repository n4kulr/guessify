import { useEffect, useState } from "react";
import PlayerAvatar from "./PlayerAvatar.jsx";
import {
  PLAYER_COLORS,
  randomAvatar,
  normalizeAvatar,
} from "./constants.js";

/**
 * Compact nickname + accent + randomize peep.
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
      <PlayerAvatar avatar={avatar} size={64} />
      <div className="profile-fields">
        <div className="profile-name-row">
          <input
            className="guess-input profile-name"
            placeholder="nickname…"
            value={name}
            maxLength={16}
            onChange={(e) => onName(e.target.value)}
          />
          {showRandom && (
            <button type="button" className="btn btn-mini" onClick={randomize}>
              randomize
            </button>
          )}
        </div>
        <div className="profile-swatches" role="group" aria-label="accent">
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
    </div>
  );
}
