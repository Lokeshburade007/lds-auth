# Publishing SecurePool to npm

The repo is structured as 6 individual scoped packages under `@securepool/*`. They're published in dependency order so each consumer can resolve its peers from the registry.

| # | Package | Depends on |
|---|--------|-----------|
| 1 | `@securepool/core` | — |
| 2 | `@securepool/application` | core |
| 3 | `@securepool/infrastructure` | core, application |
| 4 | `@securepool/persistence` | core, application |
| 5 | `@securepool/api` | core, application, infrastructure, persistence |
| 6 | `@securepool/react-sdk` | (peer: react ≥18) |

## One-time setup

### 1. Create the `securepool` npm organization

The scope `@securepool` doesn't match your npm username, so you need to claim it as an org. Free for public packages.

**npm doesn't have a `org create` CLI command** — it's web-only:

1. Go to **https://www.npmjs.com/org/create**
2. Org name: `securepool`
3. Plan: **Free** (public packages only — that's what we want)
4. Confirm — you'll be set as `owner` automatically

After creation, verify:

```bash
npm org ls securepool
```

Should list `lokeshburade007` with `owner` access.

### 2. Verify login + scope membership

```bash
npm whoami           # should print: lokeshburade007
npm org ls securepool
```

The second command should list you as a member with `developer` or `admin` rights.

### 3. (Recommended) Enable 2FA "auth-and-writes" on your npm account

Then have an OTP code ready when you publish.

## Routine publishing

Three scripts on the repo root:

```bash
npm run publish:dry           # preview what would publish, no network writes
npm run publish:all           # build everything, then publish what's missing
npm run version:bump <pkg> <version>   # bump a single package + update cross-refs
npm run version:bump --all <version>   # coordinated bump of all 6
```

The publish script:
- Skips any `<pkg>@<version>` that's already on npm (idempotent — safe to re-run after a failure mid-way).
- Publishes in the dependency order above.
- Builds first (`npm run build` is part of `publish:all`, plus per-package `prepublishOnly`).
- Stops on the first failure (no partial cascades into broken consumer installs).

### Pass an OTP for 2FA-protected publishes

If your npm account requires OTP on every publish:

```bash
npm run publish:all -- --otp=123456
```

Or run `npm publish` per package interactively and let npm prompt. The script prefers a single OTP because npm tokens are short-lived.

### Publishing under a different dist-tag

```bash
node scripts/publish-all.mjs --tag=next
```

## Bumping versions

When you change source in a package, bump that package (and only that package) before publishing. Cross-package `dependencies` stay coherent automatically:

```bash
# Patch bump on api only — also updates "@securepool/api" refs in other packages
npm run version:bump api 1.0.3

# Coordinated minor bump across all packages
npm run version:bump --all 1.1.0
```

Then:

```bash
npm run publish:dry      # confirm the plan
npm run publish:all      # publish for real
```

## Current state (first publish)

| Package | Local version | On npm |
|---------|--------------|--------|
| `@securepool/core` | 1.0.0 | — |
| `@securepool/application` | 1.0.0 | — |
| `@securepool/infrastructure` | 1.0.0 | — |
| `@securepool/persistence` | 1.0.0 | — |
| `@securepool/api` | 1.0.2 | — |
| `@securepool/react-sdk` | 1.0.0 | — |

> Note: `@securepool/api` is at 1.0.2 because runtime changes happened to it (gated rate-limiters by config flag). Cross-package deps that reference `"@securepool/core": "1.0.0"` will resolve correctly after we publish core@1.0.0 first.

## Recovering from a half-finished publish

If `publish:all` fails partway, fix the issue and re-run — the script's npm-view check will skip already-published versions and resume where it stopped.

If a published version turns out to be broken:
- Within 72 hours, `npm unpublish @securepool/<pkg>@<version>` (don't unless you have to — npm strongly discourages it).
- Otherwise, deprecate: `npm deprecate @securepool/<pkg>@<version> "use 1.0.x instead"`. Then bump and republish.

## What's actually shipped

`files` in each `package.json` whitelists only the artifacts that go into the tarball:

- `dist/` (built JS + .d.ts)
- `README.md`
- `LICENSE`
- (`prisma/` for the persistence package's schema)

Everything else (src, tsconfig, node_modules) is excluded.
