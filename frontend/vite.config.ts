import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const moduleId = id.replaceAll("\\\\", "/");
          if (/\/(?:react-)?leaflet\//.test(moduleId)) return "maps";
          if (/\/(?:lucide-react|@phosphor-icons\/react)\//.test(moduleId)) {
            return "icons";
          }
          if (/\/(?:framer-motion|gsap|@studio-freight\/lenis|react-parallax-tilt)\//.test(moduleId)) {
            return "motion";
          }
          if (/\/(?:react|react-dom|react-router)\//.test(moduleId)) {
            return "react-vendor";
          }
          if (/\/(?:i18next|react-i18next)\//.test(moduleId)) return "i18n";
          return "vendor";
        },
      },
    },
  },
});
