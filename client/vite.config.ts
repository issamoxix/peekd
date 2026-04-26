import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // FastAPI Sentinel backend (hamza features)
      "/api/dashboard": { target: "http://localhost:8000", changeOrigin: true },
      "/api/threats": { target: "http://localhost:8000", changeOrigin: true },
      "/api/heatmap": { target: "http://localhost:8000", changeOrigin: true },
      "/api/ai-content": { target: "http://localhost:8000", changeOrigin: true },
      "/api/competitors": { target: "http://localhost:8000", changeOrigin: true },
      "/api/actions": { target: "http://localhost:8000", changeOrigin: true },
      "/api/crawlers": { target: "http://localhost:8000", changeOrigin: true },
      "/api/alerts": { target: "http://localhost:8000", changeOrigin: true },
      "/api/settings": { target: "http://localhost:8000", changeOrigin: true },
      // Express analyzer backend (lan features) — projects, snapshots, runs
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
