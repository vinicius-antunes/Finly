import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/data/catalog.json")) return "catalog";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id))
            return "react-runtime";
        },
      },
    },
  },
});
