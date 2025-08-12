// vite.config.singlefile.mjs
 import { defineConfig } from "vite";
 import react from "@vitejs/plugin-react-swc";
 import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // Caminos relativos para que todo funcione en file://
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    target: "es2018",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // inlinéalo TODO (imgs, fuentes, etc.)
    sourcemap: false,
    assetsDir: "",
    minify: "esbuild",
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
      },
    },
  },
});
