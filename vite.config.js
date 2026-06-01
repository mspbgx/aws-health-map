import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-Proxy: damit `npm run dev` lokal kein CORS-Problem hat, wird /aws-health
// transparent an den AWS-Health-Endpunkt weitergereicht (genau wie nginx im Container).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Im Dev-Modus reicht Vite /api/health direkt an AWS weiter,
      // damit `npm run dev` ohne separaten Backend-Start funktioniert.
      // In Produktion uebernimmt das der Node-Server (server.js).
      "/api/health": {
        target: "https://status.aws.amazon.com",
        changeOrigin: true,
        secure: true,
        rewrite: () => "/data.json",
      },
    },
  },
});
