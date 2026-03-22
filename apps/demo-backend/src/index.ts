import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createSecurePool } from "@securepool/api";

// Load .env (local dev: from monorepo root, production: from process.env)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config(); // also check current dir

function getJwtKeys(): { privateKey: string; publicKey: string } {
  // Option 1: Keys passed directly as env vars (production)
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    return {
      privateKey: process.env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n"),
      publicKey: process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n"),
    };
  }

  // Option 2: Keys from file paths (local dev)
  const root = path.resolve(__dirname, "../../..");
  const privateKeyPath = path.resolve(root, process.env.JWT_PRIVATE_KEY_PATH || "./private.pem");
  const publicKeyPath = path.resolve(root, process.env.JWT_PUBLIC_KEY_PATH || "./public.pem");

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    return {
      privateKey: fs.readFileSync(privateKeyPath, "utf-8"),
      publicKey: fs.readFileSync(publicKeyPath, "utf-8"),
    };
  }

  console.error("JWT keys not found. Set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY env vars or provide .pem files.");
  process.exit(1);
}

async function main() {
  const { privateKey, publicKey } = getJwtKeys();
  const port = parseInt(process.env.PORT || "5001", 10);

  const { app } = await createSecurePool({
    database: {
      type: (process.env.DB_TYPE as "mongo" | "postgres") || "mongo",
      url: process.env.DB_URL || "mongodb://localhost:27017/securepool",
    },
    jwt: {
      privateKey,
      publicKey,
    },
    email: process.env.EMAIL_USER ? {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === "true",
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS || "",
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    } : undefined,
    security: {
      enableRateLimit: process.env.RATE_LIMIT_ENABLED !== "false",
      corsOrigins: process.env.CORS_ORIGINS || "*",
    },
  });

  app.listen(port, () => {
    console.log(`SecurePool API running on port ${port}`);
    console.log(`Api Docs: http://localhost:${port}/docs`);
  });
}

main().catch((err) => {
  console.error("Failed to start SecurePool:", err);
  process.exit(1);
});
