import { useCallback, useState } from "react";
import Feedback from "./Feedback.jsx";
import HowToPlay from "./HowToPlay.jsx";

export default function FabDock() {
  const [panel, setPanel] = useState(null); // null | "help" | "feedback"
  const close = useCallback(() => setPanel(null), []);

  return (
    <div className="fab-dock">
      <Feedback
        open={panel === "feedback"}
        onOpen={() => setPanel("feedback")}
        onClose={close}
      />
      <HowToPlay
        open={panel === "help"}
        onOpen={() => setPanel("help")}
        onClose={close}
      />
    </div>
  );
}
