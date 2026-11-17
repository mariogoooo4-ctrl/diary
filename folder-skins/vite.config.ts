/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed port; see src-tauri/tauri.conf.json -> build.devUrl
export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the workflow sets VITE_BASE.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: { target: "es2022", sourcemap: false },
  test: { environment: "node" },
});
