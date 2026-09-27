import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // e2e/ holds Playwright specs; .claude/worktrees holds other checkouts of this repo.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**", ".claude/**"],
  },
});
