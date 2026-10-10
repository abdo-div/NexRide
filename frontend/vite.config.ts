import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The application shell intentionally includes the shared React, i18n and
    // animation runtimes. Keep Vite's warning budget just above that measured
    // bundle while route-level pages remain lazy-loaded into separate chunks.
    chunkSizeWarningLimit: 900,
  },
});
