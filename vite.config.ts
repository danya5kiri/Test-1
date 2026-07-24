import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/Test-1/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
