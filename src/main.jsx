import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { loadTheme } from "./themes.js";
import "./styles.css";

// Apply the saved theme before the first paint to avoid a flash of the default.
loadTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
