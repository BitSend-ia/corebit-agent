import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { checkForUpdates } from "./updater";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// checar atualizacao 5s depois do app subir e a cada 6 horas
setTimeout(checkForUpdates, 5000);
setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
