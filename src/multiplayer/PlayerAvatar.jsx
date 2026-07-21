/** Tiny Skribbl-style face drawn as SVG from eyes/mouth indices. */
export default function PlayerAvatar({ avatar, size = 40, className = "" }) {
  const color = avatar?.color || "#e2b714";
  const eyes = Math.abs(Number(avatar?.eyes) || 0) % 6;
  const mouth = Math.abs(Number(avatar?.mouth) || 0) % 6;

  return (
    <svg
      className={`mp-avatar ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill={color} />
      <Eyes kind={eyes} />
      <Mouth kind={mouth} />
    </svg>
  );
}

function Eyes({ kind }) {
  switch (kind) {
    case 1: // happy arcs
      return (
        <g fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round">
          <path d="M18 26c3-4 8-4 11 0" />
          <path d="M35 26c3-4 8-4 11 0" />
        </g>
      );
    case 2: // wink
      return (
        <g>
          <circle cx="24" cy="28" r="3.5" fill="#1a1a1a" />
          <path d="M36 28h10" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 3: // wide
      return (
        <g fill="#1a1a1a">
          <ellipse cx="23" cy="28" rx="5" ry="6" />
          <ellipse cx="41" cy="28" rx="5" ry="6" />
          <circle cx="23" cy="28" r="2" fill="#fff" />
          <circle cx="41" cy="28" r="2" fill="#fff" />
        </g>
      );
    case 4: // sleepy
      return (
        <g fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round">
          <path d="M18 30h12" />
          <path d="M34 30h12" />
        </g>
      );
    case 5: // dots + brows
      return (
        <g fill="#1a1a1a">
          <path d="M18 22l8 3M38 25l8-3" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="24" cy="30" r="3" />
          <circle cx="40" cy="30" r="3" />
        </g>
      );
    default: // classic dots
      return (
        <g fill="#1a1a1a">
          <circle cx="24" cy="28" r="3.5" />
          <circle cx="40" cy="28" r="3.5" />
        </g>
      );
  }
}

function Mouth({ kind }) {
  switch (kind) {
    case 1: // grin
      return (
        <path
          d="M22 40c4 8 16 8 20 0"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
    case 2: // open
      return <ellipse cx="32" cy="44" rx="7" ry="6" fill="#1a1a1a" />;
    case 3: // flat
      return (
        <path d="M24 42h16" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
      );
    case 4: // frown
      return (
        <path
          d="M22 46c4-7 16-7 20 0"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
    case 5: // tongue
      return (
        <g>
          <path
            d="M22 40c4 7 16 7 20 0"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M28 44c2 6 6 6 8 0" fill="#e74c3c" />
        </g>
      );
    default: // small smile
      return (
        <path
          d="M24 42c3 5 13 5 16 0"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
  }
}
