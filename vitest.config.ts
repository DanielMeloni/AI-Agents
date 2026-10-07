import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{packages,agents,apps}/*/test/**/*.test.ts"],
  },
});
