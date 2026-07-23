// Brings up the LOCAL e2e backend for Playwright's webServer:
//   1. a throwaway Postgres container (rentaro-e2e-postgres on host :5437) — a
//      DEDICATED, wiped-each-run DB so e2e never touches the dev (:5436) or prod
//      data, and admin CRUD tests start from a clean, freshly-seeded catalogue;
//   2. the .NET API (sibling repo ../Rentaro) pointed at that DB on :5141, with
//      known local admin creds and all external integrations (SK/Montonio/email)
//      left unconfigured so nothing real is sent.
//
// Playwright runs this as a managed webServer command and kills it on teardown;
// we forward that signal to the dotnet child and stop the container.
//
// SAFETY: this never points at production. The API DB + admin creds are local
// throwaways defined here; api.rentaro.ee is never contacted.
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_PROJECT = process.env.RENTARO_E2E_API_PROJECT
  ? resolve(process.env.RENTARO_E2E_API_PROJECT)
  : resolve(__dirname, "../../Rentaro/src/Rentaro.Api");

const DB_CONTAINER = "rentaro-e2e-postgres";
const DB_PORT = "5437";
const API_PORT = "5141";
const CONN = `Host=localhost;Port=${DB_PORT};Database=rentaro_e2e;Username=rentaro;Password=rentaro`;

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", ...opts });
}

function log(m) {
  process.stdout.write(`[e2e-api] ${m}\n`);
}

// 1. Recreate a clean Postgres container (wipes any prior e2e data).
function startDb() {
  log("resetting e2e Postgres container…");
  sh("docker", ["rm", "-f", DB_CONTAINER]); // ignore "no such container"
  const run = sh("docker", [
    "run", "-d", "--name", DB_CONTAINER,
    "-p", `${DB_PORT}:5432`,
    "-e", "POSTGRES_DB=rentaro_e2e",
    "-e", "POSTGRES_USER=rentaro",
    "-e", "POSTGRES_PASSWORD=rentaro",
    "postgres:16",
  ]);
  if (run.status !== 0) {
    log(`docker run failed: ${run.stderr || run.stdout}`);
    process.exit(1);
  }
  // Wait for Postgres to accept connections.
  for (let i = 0; i < 60; i++) {
    const ready = sh("docker", ["exec", DB_CONTAINER, "pg_isready", "-U", "rentaro", "-d", "rentaro_e2e"]);
    if (ready.status === 0) {
      log("Postgres ready.");
      return;
    }
    sh(process.platform === "win32" ? "timeout" : "sleep", process.platform === "win32" ? ["/t", "1"] : ["1"]);
  }
  log("Postgres did not become ready in time.");
  process.exit(1);
}

let api;
function startApi() {
  log(`starting API on :${API_PORT} (project ${API_PROJECT})…`);
  api = spawn("dotnet", ["run", "--project", API_PROJECT], {
    env: {
      ...process.env,
      PORT: API_PORT,
      ASPNETCORE_ENVIRONMENT: "Development",
      ConnectionStrings__Default: CONN,
      // Known local admin creds for the admin e2e flows.
      Admin__Username: "admin",
      Admin__Password: "e2e-admin-pass",
      Admin__JwtSecret: "e2e-admin-jwt-secret-please-change-32chars-min",
      Portal__Secret: "e2e-portal-secret-please-change-0001",
      // Lift the per-IP rate limits: the suite fires many requests from one
      // browser in seconds, which would otherwise trip 429s (mirrors the unit
      // test fixture). Keeps the real limiter wired, just generously high.
      RateLimit__PermitPerMinute: "1000000",
      RateLimit__SensitivePermitPerMinute: "1000000",
      // Allow the e2e frontend dev origin to call the API directly (browser CORS).
      Cors__Origins__0: "http://localhost:3100",
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  api.on("exit", (code) => {
    log(`API exited (${code}).`);
    cleanup();
    process.exit(code ?? 0);
  });
}

let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  try { if (api && !api.killed) api.kill(); } catch {}
  log("stopping e2e Postgres container…");
  sh("docker", ["rm", "-f", DB_CONTAINER]);
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => { cleanup(); process.exit(0); });
}
process.on("exit", cleanup);

startDb();
startApi();
