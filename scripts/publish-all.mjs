#!/usr/bin/env node
/**
 * Publish @securepool/* packages in dependency order, skipping any whose
 * current local version is already on npm.
 *
 *   node scripts/publish-all.mjs              # publish what's missing
 *   node scripts/publish-all.mjs --dry-run    # show what would happen
 *   node scripts/publish-all.mjs --tag=next   # publish under a different dist-tag
 *   node scripts/publish-all.mjs --otp=123456 # pass OTP for npm 2FA in one go
 *
 * Prerequisites:
 *   - npm login              (npm whoami should print your username)
 *   - You own the @securepool scope on npm (or are a member of it)
 *   - All packages are built (npm run build) — prepublishOnly does this anyway
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Dependency order — packages must be published in this order so cross-refs resolve.
const PACKAGES_IN_ORDER = [
  "core",
  "application",
  "infrastructure",
  "persistence",
  "api",
  "react-sdk",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const tagArg = args.find((a) => a.startsWith("--tag="));
const otpArg = args.find((a) => a.startsWith("--otp="));
const tag = tagArg ? tagArg.split("=")[1] : "latest";
const otp = otpArg ? otpArg.split("=")[1] : null;

function readPkg(name) {
  const path = join(ROOT, "packages", name, "package.json");
  if (!existsSync(path)) throw new Error(`Missing package.json: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function isVersionOnNpm(name, version) {
  // `npm view <pkg>@<version> version` prints the version if it exists, empty otherwise.
  // It exits 0 in both cases for a known package; non-zero only if the package itself has never been published.
  try {
    const out = execSync(`npm view ${name}@${version} version 2>/dev/null`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out === version;
  } catch {
    // Package not published at all yet.
    return false;
  }
}

function whoami() {
  try {
    return execSync("npm whoami", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function step(msg) {
  console.log(`\n→ ${msg}`);
}

async function main() {
  console.log("SecurePool — publish-all");
  console.log("------------------------");
  console.log(`tag      = ${tag}`);
  console.log(`dry-run  = ${dryRun}`);
  console.log(`otp      = ${otp ? "(provided)" : "(none)"}`);

  if (!dryRun) {
    const me = whoami();
    if (!me) {
      console.error(
        "\n❌ npm whoami failed. Run `npm login` first, then re-run this script.\n"
      );
      process.exit(1);
    }
    console.log(`logged in as ${me}`);
  }

  // First pass: figure out what needs publishing.
  const plan = [];
  for (const name of PACKAGES_IN_ORDER) {
    const pkg = readPkg(name);
    const onNpm = !dryRun
      ? isVersionOnNpm(pkg.name, pkg.version)
      : isVersionOnNpm(pkg.name, pkg.version);
    plan.push({ name, fullName: pkg.name, version: pkg.version, onNpm });
  }

  console.log("\nPlan:");
  for (const p of plan) {
    const action = p.onNpm
      ? "skip   (already on npm)"
      : dryRun
        ? "would publish"
        : "PUBLISH";
    console.log(`  ${p.fullName.padEnd(30)} ${p.version.padEnd(8)} ${action}`);
  }

  const toPublish = plan.filter((p) => !p.onNpm);
  if (toPublish.length === 0) {
    console.log("\n✓ Nothing to publish — all versions already on npm.");
    return;
  }

  if (dryRun) {
    console.log("\nDry run — no packages were published.");
    return;
  }

  // Confirm before doing anything.
  console.log(
    `\nAbout to publish ${toPublish.length} package(s) under dist-tag "${tag}".`
  );
  console.log("Press Ctrl+C in the next 5 seconds to abort.");
  await new Promise((r) => setTimeout(r, 5000));

  // Second pass: publish in order.
  for (const p of toPublish) {
    step(`Publishing ${p.fullName}@${p.version}`);
    const cwd = join(ROOT, "packages", p.name);
    const cmd = ["publish", "--access=public", `--tag=${tag}`];
    if (otp) cmd.push(`--otp=${otp}`);
    const res = spawnSync("npm", cmd, { cwd, stdio: "inherit" });
    if (res.status !== 0) {
      console.error(`\n❌ ${p.fullName}@${p.version} failed to publish.`);
      console.error("Stopping the run — re-run after fixing the issue.");
      process.exit(res.status ?? 1);
    }
    console.log(`✓ ${p.fullName}@${p.version} published.`);
  }

  console.log("\n✓ All scheduled packages published successfully.");
}

main().catch((err) => {
  console.error("\nUnexpected failure:");
  console.error(err);
  process.exit(1);
});
