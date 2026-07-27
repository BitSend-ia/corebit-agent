import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** Verificar atualizacao no GitHub e instala em segundo plano. */
export async function checkForUpdates() {
  try {
    const update = await check();
    if (!update) return;

    console.log(`Atualizacao disponivel: ${update.version}`);
    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    console.warn("Falha ao verificar atualizacoes:", err);
  }
}
