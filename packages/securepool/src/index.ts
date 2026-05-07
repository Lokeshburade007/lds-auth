// Aggregated re-export of the SecurePool authentication library.
//
// Prefer the subpath imports — they're tree-shake friendly and make it
// obvious which layer you're depending on:
//
//   import { User } from "securepool/core";
//   import { createSecurePool } from "securepool/api";
//   import { useAuth, SecurePoolProvider } from "securepool/react-sdk";
//
// This top-level barrel export is provided as a fallback. Do not use it
// from React frontends if you want to keep server-only code (mongoose,
// nodemailer) out of the client bundle.
export * from "@securepool/core";
export * from "@securepool/application";
