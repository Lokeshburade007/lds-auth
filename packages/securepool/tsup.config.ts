import { defineConfig } from "tsup";

/**
 * The `securepool` umbrella is the ONLY package we publish. It bundles the
 * six `@securepool/*` workspace layers inline (via `noExternal`) so a single
 * `npm i securepool` is fully self-contained — no scoped packages need to
 * exist on the registry. Real third-party deps (express, bcrypt, mongoose,
 * @prisma/client, react, …) stay EXTERNAL so they resolve from the
 * consumer's node_modules and aren't duplicated into our bundle.
 *
 * Each entry maps to a subpath export so `securepool/core`, `securepool/api`,
 * `securepool/react-sdk`, etc. keep working exactly as before.
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "core/index": "src/core/index.ts",
    "application/index": "src/application/index.ts",
    "infrastructure/index": "src/infrastructure/index.ts",
    "persistence/index": "src/persistence/index.ts",
    "api/index": "src/api/index.ts",
    "react-sdk/index": "src/react-sdk/index.ts",
  },
  format: ["cjs"],
  // Inline the workspace layers' TYPES too (not just JS), otherwise the
  // emitted .d.ts would `export * from "@securepool/core"` — broken for
  // consumers who never install the scoped packages. `resolve` is scoped
  // to @securepool/* so third-party types (express, react…) stay external.
  dts: { resolve: [/^@securepool\//] },
  clean: true,
  sourcemap: false,
  target: "node18",
  // Inline the workspace layers; everything else (deps + peerDeps + node
  // builtins) is externalized by tsup automatically.
  noExternal: [/^@securepool\//],
});
