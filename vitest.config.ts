import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
  },
});
