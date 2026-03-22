#!/usr/bin/env node

/**
 * SecurePool - Cross-platform Setup Script
 * Works on macOS, Linux, and Windows
 *
 * Usage: node scripts/setup.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal) {
  return new Promise((resolve) => {
    const suffix = defaultVal ? ` [${defaultVal}]` : "";
    rl.question(`  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: opts.silent ? "pipe" : "inherit", ...opts }).toString().trim();
  } catch {
    return null;
  }
}

function runSilent(cmd) {
  return run(cmd, { silent: true, stdio: "pipe" });
}

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";
const NC = "\x1b[0m";

function step(num, total, msg) {
  console.log(`\n${BLUE}${BOLD}[${num}/${total}]${NC} ${GREEN}${msg}${NC}`);
  console.log("─".repeat(40));
}

function ok(msg) { console.log(`  ${GREEN}✓${NC} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}⚠${NC} ${msg}`); }
function fail(msg) { console.log(`  ${RED}✗${NC} ${msg}`); }

const TOTAL_STEPS = 7;

async function main() {
  console.log(`\n${BOLD}═══════════════════════════════════════${NC}`);
  console.log(`${BOLD}  SecurePool Setup${NC}`);
  console.log(`${BOLD}═══════════════════════════════════════${NC}`);

  // ──────────────────────────────────────
  // Step 1: Check Prerequisites
  // ──────────────────────────────────────
  step(1, TOTAL_STEPS, "Checking prerequisites");

  const nodeV = runSilent("node -v");
  if (nodeV) {
    ok(`Node.js ${nodeV}`);
  } else {
    fail("Node.js not found. Install from https://nodejs.org");
    process.exit(1);
  }

  const npmV = runSilent("npm -v");
  if (npmV) ok(`npm ${npmV}`);

  const hasOpenSSL = runSilent("openssl version");
  if (hasOpenSSL) {
    ok("OpenSSL available");
  } else {
    warn("OpenSSL not found - you'll need to generate RSA keys manually");
  }

  const hasMongo = runSilent("mongosh --version");
  if (hasMongo) {
    ok(`mongosh ${hasMongo}`);
  } else {
    warn("mongosh not found - MongoDB setup will be skipped");
  }

  // ──────────────────────────────────────
  // Step 2: Install Dependencies
  // ──────────────────────────────────────
  step(2, TOTAL_STEPS, "Installing dependencies");
  run("npm install");
  ok("Dependencies installed");

  // ──────────────────────────────────────
  // Step 3: Generate RSA Keys
  // ──────────────────────────────────────
  step(3, TOTAL_STEPS, "Setting up JWT RSA keys");

  const privPath = path.join(ROOT, "private.pem");
  const pubPath = path.join(ROOT, "public.pem");

  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    ok("RSA keys already exist (private.pem, public.pem)");
  } else if (hasOpenSSL) {
    runSilent(`openssl genrsa -out "${privPath}" 2048`);
    runSilent(`openssl rsa -in "${privPath}" -pubout -out "${pubPath}"`);
    ok("Generated RSA key pair");
  } else {
    warn("Cannot generate keys without OpenSSL.");
    warn("Generate manually:");
    console.log("    openssl genrsa -out private.pem 2048");
    console.log("    openssl rsa -in private.pem -pubout -out public.pem");
  }

  // ──────────────────────────────────────
  // Step 4: MongoDB Setup
  // ──────────────────────────────────────
  step(4, TOTAL_STEPS, "Database configuration");

  let dbUrl = "mongodb://localhost:27017/securepool";

  // Check if MongoDB is running
  let mongoRunning = false;
  if (hasMongo) {
    const ping = runSilent('mongosh --eval "db.runCommand({ping:1})" --quiet 2>/dev/null');
    if (ping && ping.includes("ok")) {
      mongoRunning = true;
      ok("MongoDB is running");
    } else {
      warn("MongoDB is not running. Start it before running the app.");
    }
  }

  console.log("");
  console.log(`  ${YELLOW}Choose database:${NC}`);
  console.log("  1) MongoDB without auth (simplest)");
  console.log("  2) MongoDB with auth");
  console.log("  3) Custom connection string");
  console.log("");

  const dbChoice = await ask("Enter choice", "1");

  if (dbChoice === "2") {
    const dbUser = await ask("DB username", "securepool-user");
    const dbPass = await ask("DB password", "SecurePool@123");
    const dbPassEncoded = dbPass.replace(/@/g, "%40");
    dbUrl = `mongodb://${dbUser}:${dbPassEncoded}@localhost:27017/securepool?authSource=securepool`;

    if (mongoRunning) {
      const createUserCmd = `mongosh --quiet --eval "use securepool; try { db.createUser({ user: '${dbUser}', pwd: '${dbPass}', roles: [{ role: 'readWrite', db: 'securepool' }] }); print('created'); } catch(e) { print('exists'); }"`;
      const result = runSilent(createUserCmd);
      if (result && result.includes("created")) {
        ok(`MongoDB user '${dbUser}' created`);
      } else {
        ok(`MongoDB user '${dbUser}' already exists`);
      }
    }
  } else if (dbChoice === "3") {
    dbUrl = await ask("Connection string", dbUrl);
  }

  ok(`Database: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

  // ──────────────────────────────────────
  // Step 5: Email Setup
  // ──────────────────────────────────────
  step(5, TOTAL_STEPS, "Email configuration (for OTP)");

  let emailHost = "";
  let emailPort = "";
  let emailSecure = "";
  let emailUser = "";
  let emailPass = "";
  let emailFrom = "";

  console.log("");
  console.log(`  ${YELLOW}Email is needed to send OTP codes.${NC}`);
  console.log("  You can skip and add it later to .env");
  console.log("");

  const setupEmail = await ask("Setup email now? (y/N)", "N");

  if (setupEmail.toLowerCase() === "y") {
    console.log("");
    console.log("  For Gmail: create App Password at");
    console.log("  https://myaccount.google.com/apppasswords");
    console.log("");
    emailUser = await ask("Gmail address", "");
    emailPass = await ask("App Password (16 chars)", "");

    if (emailUser && emailPass) {
      emailHost = "smtp.gmail.com";
      emailPort = "587";
      emailSecure = "false";
      emailFrom = emailUser;
      ok(`Email: ${emailUser}`);
    } else {
      warn("Email skipped (empty input)");
    }
  } else {
    warn("Email skipped - OTP emails won't be sent");
  }

  // ──────────────────────────────────────
  // Step 6: Create .env
  // ──────────────────────────────────────
  step(6, TOTAL_STEPS, "Creating .env file");

  const envPath = path.join(ROOT, ".env");
  let writeEnv = true;

  if (fs.existsSync(envPath)) {
    const overwrite = await ask(".env already exists. Overwrite? (y/N)", "N");
    writeEnv = overwrite.toLowerCase() === "y";
    if (!writeEnv) warn("Keeping existing .env");
  }

  if (writeEnv) {
    const envContent = `# Database
DB_TYPE=mongo
DB_URL=${dbUrl}

# JWT
JWT_PRIVATE_KEY_PATH=./private.pem
JWT_PUBLIC_KEY_PATH=./public.pem

# Email (Gmail SMTP)
EMAIL_HOST=${emailHost}
EMAIL_PORT=${emailPort}
EMAIL_SECURE=${emailSecure}
EMAIL_USER=${emailUser}
EMAIL_PASS=${emailPass}
EMAIL_FROM=${emailFrom}

# Server
PORT=5001

# Security
RATE_LIMIT_ENABLED=true
CORS_ORIGINS=*
`;
    fs.writeFileSync(envPath, envContent);
    ok(".env file created");
  }

  // ──────────────────────────────────────
  // Step 7: Build
  // ──────────────────────────────────────
  step(7, TOTAL_STEPS, "Building all packages");
  run("npx turbo run build --filter=@securepool/*");
  ok("All packages built");

  // ──────────────────────────────────────
  // Done
  // ──────────────────────────────────────
  console.log("");
  console.log(`${BOLD}═══════════════════════════════════════${NC}`);
  console.log(`${GREEN}${BOLD}  SecurePool setup complete!${NC}`);
  console.log(`${BOLD}═══════════════════════════════════════${NC}`);
  console.log("");
  console.log(`  ${BOLD}Start backend:${NC}`);
  console.log("    npm run start:backend");
  console.log("");
  console.log(`  ${BOLD}Start frontend:${NC} (new terminal)`);
  console.log("    npm run start:frontend");
  console.log("");
  console.log(`  ${BOLD}Open:${NC}`);
  console.log("    Frontend  → http://localhost:5173");
  console.log("    API Docs  → http://localhost:5001/docs");
  console.log("    Health    → http://localhost:5001/health");
  console.log("");

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
