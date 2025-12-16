import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");

  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.error("❌ Root container not found. Check your index.html for <div id='root'></div>.");
  }
});
