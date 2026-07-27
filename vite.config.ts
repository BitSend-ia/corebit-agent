import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O Vite 7 usa chokidar 4, que NÃO aceita mais globs em `watch.ignored`.
// Por isso o filtro é uma função — é o que evita o EBUSY em src-tauri/target.
const ignoreRustArtifacts = (path: string) =>
  path.includes("src-tauri") || path.includes(`${"target"}\\debug`) || path.includes("target/debug");

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ignoreRustArtifacts,
      // não segue links/artefatos do cargo
      followSymlinks: false,
    },
  },
  build: { target: "chrome105", outDir: "dist" },
});
