import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./index.ts"],
  dts: true,
  format: ["esm", "cjs"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ["@ai-sdk/openai", "zod"],
});
