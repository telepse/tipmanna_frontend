import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Production code retains `import "server-only"`. Vitest (node) has no
      // Next runtime for that package; alias to an empty stub so client-oriented
      // unit tests can load modules that transitively touch server actions.
      "server-only": path.resolve(__dirname, "./src/test-stubs/server-only.ts"),
    },
  },
});
