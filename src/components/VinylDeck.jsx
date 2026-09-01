export default function VinylDeck({ open = false, panel = null, children }) {
  return (
    <div className={`vinyl-deck${open ? " is-open" : ""}`}>
      <div className="vinyl-deck-well">{children}</div>
      <div className="vinyl-deck-panel">{panel}</div>
    </div>
  );
}
