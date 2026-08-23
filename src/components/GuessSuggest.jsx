import { useEffect, useId, useRef, useState } from "react";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 220;

// One cache for the whole session. Players retype the same prefixes constantly
// ("dan" → "dani" → "dan"), and the answers never change within a round.
const cache = new Map();

async function fetchSuggestions(kind, q, roundArtists) {
  const artistsKey = (roundArtists || []).join("\0").toLowerCase();
  const key = `${kind}:${q.toLowerCase()}:${artistsKey}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const params = new URLSearchParams({
      kind,
      q,
    });
    if (roundArtists?.length) {
      params.set("artists", roundArtists.join(","));
    }
    const r = await fetch(`/api/suggest?${params}`);
    if (!r.ok) return [];
    const data = await r.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    cache.set(key, items);
    return items;
  } catch {
    return [];
  }
}

/**
 * Catalogue-backed autocomplete for a guess field.
 *
 * Deliberately sourced from Last.fm rather than the current playlist: listing
 * the playlist's own tracks would show the player the answer.
 *
 * Returns props to spread onto the input plus the state the drop-up needs.
 * `onPick` receives the chosen string — callers decide whether to submit.
 */
export function useGuessSuggest({
  kind,
  value,
  enabled = true,
  roundArtists = [],
  onPick,
}) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId().replace(/:/g, "");
  // Ignore results for a query the player has already typed past.
  const queryRef = useRef("");
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const q = value.trim();
  queryRef.current = q;

  const artistsKey = (roundArtists || []).join("\0");

  useEffect(() => {
    if (!enabled || q.length < MIN_CHARS) {
      setItems([]);
      setActive(-1);
      return undefined;
    }
    const t = setTimeout(async () => {
      const found = await fetchSuggestions(kind, q, roundArtists);
      if (queryRef.current !== q) return;
      setItems(found);
      setActive(-1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [kind, q, enabled, artistsKey]);

  const visible = enabled && open && items.length > 0;

  function choose(item) {
    setOpen(false);
    setActive(-1);
    onPickRef.current?.(item.name);
  }

  /**
   * Returns true when the key was consumed, so callers can keep their own
   * Enter-to-submit behaviour for every other case.
   */
  function handleKeyDown(e) {
    if (!visible) {
      // Esc with no list open should still fall through to the caller.
      return false;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => {
        const next = i + dir;
        if (next < 0) return items.length - 1;
        if (next >= items.length) return 0;
        return next;
      });
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
      return true;
    }
    if (e.key === "Enter" && active >= 0 && items[active]) {
      e.preventDefault();
      choose(items[active]);
      return true;
    }
    if (e.key === "Tab" && active >= 0 && items[active]) {
      e.preventDefault();
      choose(items[active]);
      return true;
    }
    return false;
  }

  return {
    items,
    active,
    visible,
    listId,
    choose,
    handleKeyDown,
    /** Spread onto the <input>. */
    inputProps: {
      role: "combobox",
      "aria-expanded": visible,
      "aria-controls": listId,
      "aria-autocomplete": "list",
      "aria-activedescendant":
        visible && active >= 0 ? `${listId}-${active}` : undefined,
      autoComplete: "off",
      onFocus: () => setOpen(true),
      // Delay so a click on an option lands before the list unmounts.
      onBlur: () => setTimeout(() => setOpen(false), 120),
    },
    /** Call after the caller submits, so the list doesn't linger. */
    dismiss: () => {
      setOpen(false);
      setActive(-1);
    },
  };
}

/** The drop-up itself. Renders nothing unless there's something to show. */
export default function GuessSuggest({ suggest }) {
  const { items, active, visible, listId, choose } = suggest;
  if (!visible) return null;
  return (
    <ul className="guess-suggest" id={listId} role="listbox">
      {items.map((item, i) => (
        <li key={`${item.name}-${item.artist || i}`} role="presentation">
          <button
            type="button"
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`guess-suggest-item${i === active ? " is-active" : ""}`}
            // Beat the input's blur so the click isn't cancelled mid-flight.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(item)}
          >
            <span className="guess-suggest-name">{item.name}</span>
            {item.artist && (
              <span className="guess-suggest-by">{item.artist}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
