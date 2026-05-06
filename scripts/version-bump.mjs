#!/usr/bin/env node
/**
 * Bump a SecurePool package's version AND update every other package that
 * depends on it so cross-references stay coherent.
 *
 *   node scripts/version-bump.mjs <package> <new-version>
 *   node scripts/version-bump.mjs api 1.0.3
 *   node scripts/version-bump.mjs --all 1.1.0    # bump every package to the same version
 *
 * Examples:
 *   # bump only @securepool/api (and any package that depends on it)
 *   node scripts/version-bump.mjs api 1.0.3
 *
 *   # release a coordinated minor across all 6 packages
 *   node scripts/version-bump.mjs --all 1.1.0
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const PACKAGES = [
  "core",
  "application",
  "infrastructure",
  "persistence",
  "api",
  "react-sdk",
];

const args = process.argv.slice(2);
if (args.length !== 2 || (args[0] !== "--all" && !PACKAGES.includes(args[0]))) {
  console.error("Usage:");
  console.error("  node scripts/version-bump.mjs <package> <new-version>");
  console.error("  node scripts/version-bump.mjs --all <new-version>");
  console.error(`Valid <package>: ${PACKAGES.join(", ")}, or --all`);
  process.exit(1);
}

const target = args[0];
const newVersion = args[1];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error(`Invalid semver: ${newVersion}`);
  process.exit(1);
}

const pkgPaths = Object.fromEntries(
  PACKAGES.map((p) => [p, join(ROOT, "packages", p, "package.json")])
);

function read(name) {
  return JSON.parse(readFileSync(pkgPaths[name], "utf8"));
}
function write(name, json) {
  writeFileSync(pkgPaths[name], JSON.stringify(json, null, 2) + "\n");
}

const targets = target === "--all" ? PACKAGES : [target];

console.log(`Bumping ${targets.join(", ")} to ${newVersion}`);

// 1. Update version on each target package.
for (const t of targets) {
  const pkg = read(t);
  console.log(`  ${pkg.name}: ${pkg.version} → ${newVersion}`);
  pkg.version = newVersion;
  write(t, pkg);
}

// 2. Update cross-package deps in every package so dependents reference the new version.
for (const p of PACKAGES) {
  const pkg = read(p);
  let changed = false;
  for (const depKey of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[depKey];
    if (!deps) continue;
    for (const t of targets) {
      const fullName = `@securepool/${t}`;
      if (deps[fullName] && deps[fullName] !== newVersion) {
        // Only rewrite explicit version refs (not "file:..." dev links).
        if (/^\d/.test(deps[fullName]) || deps[fullName].startsWith("^") || deps[fullName].startsWith("~")) {
          console.log(`  ${pkg.name}: ${depKey}.${fullName}: ${deps[fullName]} → ${newVersion}`);
          deps[fullName] = newVersion;
          changed = true;
        }
      }
    }
  }
  if (changed) write(p, pkg);
}

console.log(`\n✓ Done. Run \`npm run build\` then \`npm run publish:all\` (or \`publish:dry\` first).`);
