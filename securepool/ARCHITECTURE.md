# SecurePool - Architecture Guide

## What is SecurePool?

SecurePool is a **plug-and-play authentication framework** distributed as NPM packages. Other developers install it and get a full auth system (JWT, OTP, sessions, multi-tenancy) without building one from scratch.

Think of it like **Auth0 or Firebase Auth** — but self-hosted and open-source.

---

## Monorepo Structure

```
securepool/
│
├── packages/                ← THE PRODUCT (published to npm)
│   ├── core/                   @securepool/core
│   ├── application/            @securepool/application
│   ├── infrastructure/         @securepool/infrastructure
│   ├── persistence/            @securepool/persistence
│   ├── api/                    @securepool/api
│   └── react-sdk/              @securepool/react-sdk
│
├── apps/                    ← DEMO APPS (for testing, not published)
│   ├── demo-backend/           Example server using @securepool/api
│   └── demo-frontend/          Example React app using @securepool/react-sdk
│
├── scripts/                 ← Automation
│   └── setup.sh                One-command setup script
│
├── .env                     ← Secrets (never in git)
├── private.pem              ← JWT private key (never in git)
├── public.pem               ← JWT public key (never in git)
├── package.json             ← Monorepo root (npm workspaces)
├── tsconfig.base.json       ← Shared TypeScript config
├── turbo.json               ← Turborepo build pipeline
├── SETUP.md                 ← How to run locally
├── ARCHITECTURE.md          ← This file
└── .env.example             ← Template for .env
```

---

## packages/ vs apps/ — The Key Distinction

### `packages/*` = The Library (YOUR PRODUCT)

This is the code that gets **published to npm**. Other developers install it:

```bash
npm install @securepool/api          # For their backend
npm install @securepool/react-sdk    # For their frontend
```

**You do NOT deploy packages.** They live on the npm registry. They are libraries, not running servers.

### `apps/*` = Demo Applications (FOR TESTING)

These are small apps that **use** your packages. They exist so you can:

- Test your packages during development
- Show other developers how to use your library
- Deploy a working demo

**These are what you deploy** to Railway/Vercel.

### Side-by-Side Comparison

| | `packages/*` | `apps/*` |
|---|---|---|
| Purpose | The library (product) | Example usage / testing |
| Published to npm? | **Yes** | No |
| Deployed as server? | No | **Yes** |
| Who uses it? | Other developers | Only you |
| Size | Thousands of lines | ~20 lines each |
| Analogy | The `express` npm package | Express's example app |

---

## Package Dependency Flow

```
@securepool/core          ← Zero dependencies. Pure entities & enums.
       ↓
@securepool/application   ← Depends on core. Interfaces & business logic.
       ↓
@securepool/infrastructure ← Depends on core + application.
       ↓                     JWT, bcrypt, OTP, email implementations.
@securepool/persistence   ← Depends on core + application.
       ↓                     MongoDB & PostgreSQL repositories.
@securepool/api           ← Depends on ALL above.
                             Express routes, middleware, createSecurePool().

@securepool/react-sdk     ← Independent. React provider, hooks, components.
                             Only talks to the API via HTTP.
```

### Why separate packages?

A developer building a backend-only system installs:
```bash
npm install @securepool/api
```

A developer building a React frontend installs:
```bash
npm install @securepool/react-sdk
```

They don't need each other's code. This is how enterprise libraries work.

---

## Clean Architecture Layers

```
┌─────────────────────────────────────────────┐
│  API Layer (@securepool/api)                │  Express routes, middleware
│  ─ depends on everything below ─            │  Entry point: createSecurePool()
├─────────────────────────────────────────────┤
│  Infrastructure (@securepool/infrastructure)│  JWT (jsonwebtoken), bcrypt,
│  ─ implements application interfaces ─      │  OTP, Google SSO, Nodemailer
├─────────────────────────────────────────────┤
│  Persistence (@securepool/persistence)      │  MongoDB (mongoose) repos
│  ─ implements application interfaces ─      │  PostgreSQL (prisma) repos
├─────────────────────────────────────────────┤
│  Application (@securepool/application)      │  AuthService, RefreshTokenService
│  ─ depends only on core ─                   │  Interfaces (IUserRepository, etc.)
├─────────────────────────────────────────────┤
│  Core (@securepool/core)                    │  User, Role, Session, OtpCode,
│  ─ zero dependencies ─                      │  RefreshToken, AuditLog, enums
└─────────────────────────────────────────────┘
```

**Rule:** Each layer can only depend on layers BELOW it. Never above. Never sideways.

**Why?** If you swap MongoDB for PostgreSQL, only the persistence layer changes. Business logic (application) stays untouched.

---

## What Gets Deployed Where

```
┌──────────────────────────────────────┐
│  npm registry (npmjs.com)            │
│                                      │
│  Publish:                            │
│  ├── @securepool/core                │
│  ├── @securepool/application         │
│  ├── @securepool/infrastructure      │
│  ├── @securepool/persistence         │
│  ├── @securepool/api                 │
│  └── @securepool/react-sdk           │
│                                      │
│  Command: npm publish --access public│
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Server (Railway / Render / AWS)     │
│                                      │
│  Deploy: apps/demo-backend           │
│  What it does: runs createSecurePool │
│  and listens on a port               │
│                                      │
│  This is a 20-line file that USES    │
│  @securepool/api                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Static Hosting (Vercel / Netlify)   │
│                                      │
│  Deploy: apps/demo-frontend          │
│  What it does: serves the React app  │
│  that USES @securepool/react-sdk     │
│                                      │
│  Build output: static HTML/JS/CSS    │
└──────────────────────────────────────┘
```

---

## Real-World Analogy

| Auth0 (the company) | SecurePool (your project) |
|---|---|
| `auth0` npm package | `packages/api` — the backend library |
| `@auth0/auth0-react` npm package | `packages/react-sdk` — the React library |
| Auth0's dashboard website | `apps/demo-frontend` — your demo UI |
| Auth0's API servers | `apps/demo-backend` — your demo server |
| Auth0's internal modules | `packages/core`, `application`, `infrastructure`, `persistence` |

---

## How Another Developer Uses SecurePool

### Their Backend (their own project, not yours)

```bash
npm install @securepool/api
```

```ts
// their-project/server.ts
import { createSecurePool } from "@securepool/api";

const { app } = await createSecurePool({
  database: { type: "mongo", url: process.env.MONGO_URL },
  jwt: { privateKey: process.env.JWT_KEY, publicKey: process.env.JWT_PUB },
});

app.listen(3000);
// They now have full auth: /auth/login, /auth/register, /sessions, etc.
```

### Their Frontend (their own React app)

```bash
npm install @securepool/react-sdk
```

```tsx
// their-project/App.tsx
import { SecurePoolProvider, LoginForm, useAuth } from "@securepool/react-sdk";

function App() {
  return (
    <SecurePoolProvider config={{ apiBaseUrl: "https://their-api.com", tenantId: "their-tenant" }}>
      <LoginForm onSuccess={() => console.log("logged in!")} />
    </SecurePoolProvider>
  );
}
```

---

## Features Implemented

| Feature | Package | Level |
|---|---|---|
| User, Role, Session entities | core | Level 2 |
| Repository interfaces, AuthService | application | Level 3 |
| JWT (RS256), bcrypt, OTP, Google SSO | infrastructure | Level 5 |
| MongoDB + PostgreSQL repositories | persistence | Level 5-6 |
| Express routes, middleware, rate limiting | api | Level 7 |
| React provider, hooks, UI components | react-sdk | Level 5 |
| Multi-tenancy | core + application | Level 4 |
| Session & device management | api + react-sdk | Level 4 |
| Audit logging | application + persistence | Level 4 |
| Refresh token rotation | application | Level 3 |
| Email OTP via Nodemailer | infrastructure | Level 6 |
| Forgot/reset/change password | application + api | Level 6 |
| Multi-account switching | react-sdk | Level 6 |
| Swagger API documentation | api | Level 7 |
| Role-based access control (RBAC) | api middleware | Level 3 |

---

## Useful Commands

| Command | What |
|---|---|
| `npm run setup` | Interactive first-time setup |
| `npm run build` | Build all packages |
| `npm run start:backend` | Start API server (port 5001) |
| `npm run start:frontend` | Start React app (port 5173) |
| `npm run clean` | Delete all dist folders |

---

## Files You Should NEVER Commit

| File | Why |
|---|---|
| `.env` | Contains DB credentials, email passwords |
| `private.pem` | JWT signing key — anyone with this can forge tokens |
| `public.pem` | JWT verification key |
| `node_modules/` | Dependencies (reinstall with npm install) |

These are in `.gitignore`. In production, set them as environment variables on your hosting platform.
