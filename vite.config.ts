import { defineConfig } from "vite";
import { resolve } from "path";

const entry = (process.env.ENTRY as string) || "background";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: entry === "background",
    lib: {
      entry: resolve(__dirname, `src/${entry}.ts`),
      name: "QRReader",
      formats: ["iife"],
      fileName: () => `${entry}.js`,
    },
  },
});
