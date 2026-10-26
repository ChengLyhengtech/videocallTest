import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Add allowedHosts to permit any trycloudflare domain (or a specific one)
    allowedHosts: [
      "true", // Allows all hosts (or you can use true to allow everything safely for tunnels)
    ],
    proxy: {
      "/api": {
        target: "http://localhost:5201",
        changeOrigin: true,
        secure: false,
      },
      "/hubs": {
        target: "http://localhost:5201",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
