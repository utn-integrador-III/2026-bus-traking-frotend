import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/services/__tests__/notificationService.test.ts"],
    setupFiles: ["./src/__mocks__/vitest-globals.ts"],
  },
});