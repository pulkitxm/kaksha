import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["core/src/**/*.test.ts", "server/src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["core/src/**/*.ts"],
      exclude: ["core/src/**/*.test.ts", "core/src/index.ts"],
      thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
    },
  },
  resolve: {
    alias: { "@kaksha/core": new URL("./core/src/index.ts", import.meta.url).pathname },
  },
});
