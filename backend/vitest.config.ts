import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 1. Environment: Important for backend/Supertest
    environment: "node",

    // 2. Globals: Allows you to use 'describe', 'it', 'expect'
    // without importing them in every single file.
    globals: true,

    // 3. Include: Tell Vitest where to find your tests
    include: ["src/tests/**/*.test.ts"],

    // 4. Timeout: AI calls take time!
    testTimeout: 30000,
  },
});
