# SecurePool

Production-grade, self-hosted authentication framework for Node.js and React. Plug-and-play JWT auth, OTP, Google SSO, multi-tenancy, session management — distributed as a single NPM package (`securepool`) with layered subpath imports.

---

## Run Locally (3 Commands)

### Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| **Node.js 20+** | Yes | [nodejs.org](https://nodejs.org) |
| **MongoDB 6+** | Yes | See below |
| **Git** | Yes | Pre-installed on Mac. Windows: [git-scm.com](https://git-scm.com) |

### Install MongoDB

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
1. Download from https://www.mongodb.com/try/download/community
2. Run the installer (choose "Complete" install)
3. Check "Install MongoDB as a Service"
4. Also install [mongosh](https://www.mongodb.com/try/download/shell)

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Setup & Run

```bash
# Step 1: Clone and enter the project
git clone <your-repo-url>
cd securepool

# Step 2: Run interactive setup (installs deps, generates keys, configures DB & email, builds)
npm run setup

# Step 3: Start both servers
npm run start:backend     # Terminal 1 → API on http://localhost:5001
npm run start:frontend    # Terminal 2 → UI on http://localhost:5173
```

That's it. Open http://localhost:5173 and register your first account.

---

## Database Support

SecurePool supports **MongoDB** and **SQL databases** (PostgreSQL / MySQL). Switch with one config change:

```ts
// MongoDB
createSecurePool({ database: { type: "mongo", url: "mongodb://..." } })

// PostgreSQL
createSecurePool({ database: { type: "postgres", url: "postgresql://..." } })
```

| Database | Guide | ORM | Migration needed? |
|----------|-------|-----|-------------------|
| MongoDB | [DATABASE_MONGODB.md](docs/DATABASE_MONGODB.md) | Mongoose | No (auto-creates collections) |
| PostgreSQL | [DATABASE_SQL.md](docs/DATABASE_SQL.md) | Prisma | Yes (`prisma migrate dev`) |
| MySQL | [DATABASE_SQL.md](docs/DATABASE_SQL.md) | Prisma | Yes (`prisma migrate dev`) |

---

## Documentation

| Document | What it covers |
|----------|---------------|
| [SETUP.md](SETUP.md) | Local development — prerequisites, RSA keys, `.env`, running backend + frontend |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Why monorepo, packages vs apps, dependency flow, clean architecture layers |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production — cloud DB, Railway (backend), Vercel (frontend), npm publishing, Docker |
| [DATABASE_MONGODB.md](docs/DATABASE_MONGODB.md) | MongoDB — local setup, Atlas cloud, collections, indexes, monitoring |
| [DATABASE_SQL.md](docs/DATABASE_SQL.md) | PostgreSQL / MySQL — local setup, cloud providers, Prisma migrations, schema details |

---

### What `npm run setup` Does

The setup script runs on **Mac, Windows, and Linux** (it's a Node.js script, not bash). It will:

1. Check prerequisites (Node.js, MongoDB, OpenSSL)
2. Run `npm install`
3. Generate RSA keys for JWT (`private.pem`, `public.pem`)
4. Ask you to choose database mode (simple / with auth / custom URL)
5. Optionally configure Gmail SMTP for OTP emails
6. Create your `.env` file
7. Build all 6 packages

### URLs After Setup

| URL | What |
|-----|------|
| http://localhost:5173 | Frontend — login, signup, dashboard |
| http://localhost:5001/docs | Swagger API Docs — try all endpoints live |
| http://localhost:5001/health | Health check |

### Killing a Running Server

If you get `EADDRINUSE` (port already in use):

**macOS / Linux:**
```bash
lsof -ti:5001 | xargs kill -9
```

**Windows (PowerShell):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process -Force
```

---

## Features

- **JWT Authentication** — RS256-based access + refresh tokens with rotation. Tokens carry the user's `email` claim out of the box, plus a **`customClaims` hook** to inject app-specific claims (resolved fresh on every mint, including refresh)
- **OTP Login** — Email-based one-time passwords with expiry and attempt limits
- **Email Verification** — OTP-verified registration (user created only after verification)
- **Password Management** — Forgot password (OTP reset) + change password (authenticated)
- **Google SSO** — Login with Google ID tokens
- **Multi-Tenancy** — Tenant-isolated data via `x-tenant-id` header
- **Session Management** — Device tracking, session listing, per-device revocation
- **Multi-Account Switching** — Store multiple accounts, switch without re-login
- **Role-Based Access Control** — RBAC middleware for route protection
- **Multi-Database** — MongoDB (Mongoose) and PostgreSQL (Prisma) out of the box
- **Rate Limiting** — Per-route rate limits (login, OTP, general)
- **Audit Logging** — Tracks login, register, password reset, OTP events
- **Swagger API Docs** — Interactive API explorer at `/docs`
- **React SDK** — Provider, hooks, pre-built components (LoginForm, SignupForm, OTP, SessionList)

---

## Install as NPM Package

**One package, one install.** As of `1.1.0`, SecurePool ships as a single
self-contained package — `securepool` — that bundles every layer. Import
the layer you need via a subpath (`securepool/api`, `securepool/react-sdk`,
`securepool/core`, …); there are no separate scoped packages to install.

```bash
npm install securepool
```

**Backend:**

```ts
import { createSecurePool } from "securepool/api";

const { app } = await createSecurePool({
  database: { type: "mongo", url: "mongodb://localhost:27017/myapp" },
  jwt: { privateKey: "...", publicKey: "..." },

  // OPTIONAL — enrich every access token with app-specific claims.
  // Called on each mint (login / register / OTP / Google / refresh) so
  // claims stay fresh across the refresh cycle. The `email` claim is
  // added automatically; this merges on top. Reserved keys
  // (sub/tenantId/iat/exp) are protected. Keep it cheap — it's on the
  // auth hot path. Do NOT put rapidly-mutating data (e.g. a billing
  // plan) here if your access-token TTL is long — resolve those
  // server-side per request instead.
  customClaims: async ({ userId, tenantId }) => {
    const roles = await myRoleStore.getRoles(userId);
    return { roles };
  },
});

app.listen(3000);
// Auth endpoints ready: /auth/login, /auth/register, /sessions, etc.
```

**Frontend:**

```tsx
import { SecurePoolProvider, LoginForm, useAuth } from "securepool/react-sdk";

function App() {
  return (
    <SecurePoolProvider config={{ apiBaseUrl: "http://localhost:3000", tenantId: "default" }}>
      <LoginForm onSuccess={() => console.log("Logged in!")} />
    </SecurePoolProvider>
  );
}
```

---

## Layers (subpath imports)

The library is organized in clean-architecture layers. They're internal
build inputs bundled into the single `securepool` package — import each
via its subpath:

| Subpath import | Description |
|---------|-------------|
| `securepool/core` | Entities and enums (User, Role, Session, OTP, etc.) |
| `securepool/application` | Business logic, interfaces, AuthService, `ClaimsProvider` |
| `securepool/infrastructure` | JWT, bcrypt, OTP, Nodemailer, Google SSO |
| `securepool/persistence` | MongoDB + PostgreSQL repository implementations |
| `securepool/api` | Express routes, middleware, `createSecurePool()` |
| `securepool/react-sdk` | React provider, `useAuth()` hook, UI components |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/docs` | No | Swagger API documentation |
| POST | `/auth/register` | No | Register + send verification OTP |
| POST | `/auth/verify-email` | No | Verify OTP and create account |
| POST | `/auth/login` | No | Login with email + password |
| POST | `/auth/otp/request` | No | Request OTP for login |
| POST | `/auth/otp/verify` | No | Verify OTP and login |
| POST | `/auth/google` | No | Google SSO login |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/forgot-password` | No | Send password reset OTP |
| POST | `/auth/reset-password` | No | Reset password with OTP |
| POST | `/auth/change-password` | Yes | Change password (old + new) |
| GET | `/sessions` | Yes | List active sessions |
| DELETE | `/sessions/:id` | Yes | Revoke a session |
| DELETE | `/sessions` | Yes | Revoke all sessions |

All `/auth/*` routes require `x-tenant-id` header. Authenticated routes require `Authorization: Bearer <token>`.

---

## Project Structure

```
securepool/
├── packages/              # NPM library packages (the product)
│   ├── core/              # Entities, enums — zero dependencies
│   ├── application/       # Interfaces, AuthService — business logic
│   ├── infrastructure/    # JWT, bcrypt, OTP, email — implementations
│   ├── persistence/       # MongoDB + PostgreSQL — database layer
│   ├── api/               # Express server — routes, middleware, Swagger
│   └── react-sdk/         # React — provider, hooks, UI components
│
├── apps/                  # Demo applications (for testing)
│   ├── demo-backend/      # Example server using @securepool/api
│   └── demo-frontend/     # Example React app using @securepool/react-sdk
│
├── scripts/
│   └── setup.sh           # One-command setup script
│
├── docs/
│   ├── DATABASE_MONGODB.md # MongoDB setup (local + Atlas)
│   └── DATABASE_SQL.md     # PostgreSQL / MySQL setup (local + cloud)
│
├── SETUP.md               # Local development guide
├── ARCHITECTURE.md         # Code structure and design decisions
├── DEPLOYMENT.md           # Production deployment guide
└── README.md              # This file
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Interactive first-time setup (DB, keys, email, build) |
| `npm run build` | Build all packages |
| `npm run start:backend` | Start API server on port 5001 |
| `npm run start:frontend` | Start React app on port 5173 |
| `npm run clean` | Delete all dist folders |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict mode) |
| Backend Framework | Express.js |
| Database | MongoDB (Mongoose) / PostgreSQL (Prisma) |
| Authentication | JWT (RS256), bcrypt, OTP |
| Email | Nodemailer (Gmail SMTP) |
| Frontend | React 19, React Router |
| Build System | Turborepo + npm workspaces |
| API Docs | Swagger UI (OpenAPI 3.0) |

---

## License

MIT
