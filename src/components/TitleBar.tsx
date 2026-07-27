import type { MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { agent } from "../api";
import logo from "../assets/logo.png";

/** Minimiza para a barra de tarefas (comando nativo com fallback na API JS). */
async function minimize() {
  try {
    await agent.minimize();
  } catch (err) {
    console.error("minimize_window falhou, usando a API da janela", err);
    await getCurrentWindow().minimize();
  }
}

/** Fecha escondendo na bandeja. */
async function hide() {
  try {
    await agent.hide();
  } catch (err) {
    console.error("hide_window falhou, usando a API da janela", err);
    await getCurrentWindow().hide();
  }
}

export default function TitleBar() {
  /**
   * O arrasto só pode começar quando o clique for na área vazia da barra.
   * Se iniciar sobre os botões, o Windows entra no loop de arrasto e o
   * evento de clique nunca chega — era isso que "quebrava" minimizar/fechar.
   */
  function onMouseDown(event: MouseEvent<HTMLElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    void getCurrentWindow().startDragging();
  }

  return (
    <header className="titlebar" onMouseDown={onMouseDown}>
      <span className="brand">
        <img src={logo} alt="" className="brand-logo" />
        Corebit Agent
      </span>
      <span className="win-buttons">
        <button
          type="button"
          className="icon-btn"
          aria-label="Minimizar para a barra de tarefas"
          title="Minimizar (barra de tarefas)"
          onClick={() => void minimize()}
        >
          &#x2013;
        </button>
        <button
          type="button"
          className="icon-btn danger"
          aria-label="Fechar para a bandeja"
          title="Fechar (continua na bandeja)"
          onClick={() => void hide()}
        >
          &#x2715;
        </button>
      </span>
    </header>
  );
}
