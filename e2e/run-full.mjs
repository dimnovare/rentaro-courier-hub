// `npm run e2e:full` entry point. Sets E2E_LOCAL_STACK so playwright.config.ts
// boots the local stack (throwaway Postgres + API + Next dev), then runs the
// Playwright suite. Cross-platform (no cross-env dependency). Extra args pass
// through, e.g. `npm run e2e:full -- e2e/admin.spec.ts`.
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, E2E_LOCAL_STACK: "1" },
});
process.exit(r.status ?? 1);
