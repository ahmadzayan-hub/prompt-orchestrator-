import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startOllamaFixture } from "../e2e/ollama-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules/supabase/bin", process.platform === "win32" ? "supabase.exe" : "supabase");
// Do not inherit any credentials/configuration for a hosted backend or provider.
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/^(SUPABASE_|NEXT_PUBLIC_|OLLAMA_|EXTENSION_API_KEY)/i.test(key)
));
const backendDir = await mkdtemp(path.join(tmpdir(), "prompt-orchestrator-e2e-"));
const projectId = path.basename(backendDir).toLowerCase();
let provider;
let backendAttempted = false;
let activeChild;
let cleanupSucceeded = true;

function run(command, args, { env = cleanEnv, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: command === cli ? backendDir : root, env, windowsHide: true, stdio: capture ? "pipe" : "inherit" });
    activeChild = child;
    let output = "";
    let errors = "";
    if (capture) {
      child.stdout.on("data", chunk => { output += chunk; });
      child.stderr.on("data", chunk => { errors += chunk; });
    }
    child.once("error", reject);
    child.once("close", code => {
      if (activeChild === child) activeChild = undefined;
      if (code === 0) resolve(output);
      else {
        // CLI output may include disposable keys; never echo it unfiltered.
        const safeErrors = errors.replace(/eyJ[\w.-]+|sb_(?:secret|publishable)_[\w-]+/g, "[redacted]");
        reject(new Error(`${path.basename(command)} ${args[0]} failed (${code})\n${safeErrors}`));
      }
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    process.exitCode = 1;
    activeChild?.kill(signal);
  });
}

try {
  await run("docker", ["info"], { capture: true });
  await cp(path.join(root, "supabase/migrations"), path.join(backendDir, "supabase/migrations"), { recursive: true });
  const config = (await readFile(path.join(root, "e2e/supabase.toml"), "utf8"))
    .replace('project_id = "prompt-orchestrator-e2e"', `project_id = "${projectId}"`);
  await writeFile(path.join(backendDir, "supabase/config.toml"), config);
  console.log("Starting disposable Supabase (Auth, PostgREST, PostgreSQL and captured email)...");
  backendAttempted = true;
  await run(cli, ["start", "--workdir", backendDir, "--exclude", "realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor"], { capture: true });
  const status = JSON.parse(await run(cli, ["status", "--workdir", backendDir, "--output", "json"], { capture: true }));
  if (status.API_URL !== "http://127.0.0.1:55421" || !status.ANON_KEY) {
    throw new Error("Refusing unexpected backend URL or missing disposable public key");
  }
  const env = {
    ...cleanEnv,
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: "",
    EXTENSION_API_KEY: "",
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
    OLLAMA_BASE_URL: "http://127.0.0.1:55425",
    OLLAMA_MODEL_FAST: "fixture-fast",
    OLLAMA_MODEL_REASONING: "fixture-reasoning",
    OLLAMA_MODEL_REWRITE: "fixture-rewrite",
    E2E_DISPOSABLE_BACKEND: projectId
  };
  provider = await startOllamaFixture();
  await run(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env });
  await run(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], { env });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (provider) await new Promise(resolve => provider.close(resolve));
  if (backendAttempted) {
    console.log("Removing the disposable backend and its test data...");
    try {
      await run(cli, ["stop", "--workdir", backendDir, "--no-backup"], { capture: true });
    } catch (error) {
      console.error(error.message);
      console.error(`Retained disposable project ${projectId} at ${backendDir} for cleanup.`);
      cleanupSucceeded = false;
      process.exitCode = 1;
    }
  }
  // Only remove the directory returned by mkdtemp above, never a caller's path.
  if (path.dirname(backendDir) !== path.resolve(tmpdir()) || !path.basename(backendDir).startsWith("prompt-orchestrator-e2e-")) {
    throw new Error("Refusing cleanup outside the temporary test directory");
  }
  if (cleanupSucceeded) await rm(backendDir, { recursive: true, force: true });
}
