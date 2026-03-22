# SecurePool - Local Setup Guide

## Quick Start (One Command)

```bash
cd securepool
npm run setup
```

This interactive script handles everything:
- Checks prerequisites (Node.js, MongoDB, OpenSSL)
- Installs dependencies
- Generates RSA keys for JWT
- Sets up MongoDB (with or without authentication)
- Configures email for OTP (optional)
- Creates `.env` file
- Builds all packages
- Verifies the setup

After setup, start the servers:

```bash
# Terminal 1 - Backend
npm run start:backend

# Terminal 2 - Frontend
npm run start:frontend
```

Open:
- Frontend: http://localhost:5173
- API Docs: http://localhost:5001/docs
- Health Check: http://localhost:5001/health

---

## Manual Setup (Step by Step)

If you prefer manual setup, follow the steps below.

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | `brew install node` |
| MongoDB | 6+ | `brew install mongodb-community` |
| OpenSSL | any | Pre-installed on macOS |

---

### Step 1: Clone & Install

```bash
cd securepool
npm install
```

---

## Step 2: Start MongoDB

**Option A: Without authentication (simple)**

```bash
mongod --dbpath ~/mongodb-data
```

**Option B: With authentication (production-like)**

```bash
# Start MongoDB with auth
mongod --dbpath ~/mongodb-data --auth
```

Then in a new terminal, create the database user:

```bash
mongosh
```

```js
use securepool

db.createUser({
  user: "securepool-user",
  pwd: "SecurePool@123",
  roles: [{ role: "readWrite", db: "securepool" }]
})

exit
```

Verify it works:

```bash
mongosh "mongodb://securepool-user:SecurePool%40123@localhost:27017/securepool?authSource=securepool"
```

---

## Step 3: Generate RSA Keys (for JWT)

```bash
cd securepool
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

---

## Step 4: Create `.env` File

Create a `.env` file in the `securepool/` root:

```env
# Database
DB_TYPE=mongo
DB_URL=mongodb://localhost:27017/securepool

# If using auth (Step 2 Option B):
# DB_URL=mongodb://securepool-user:SecurePool%40123@localhost:27017/securepool?authSource=securepool

# JWT (paths to RSA key files)
JWT_PRIVATE_KEY_PATH=./private.pem
JWT_PUBLIC_KEY_PATH=./public.pem

# Email (Gmail SMTP - optional, needed for OTP emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=your-email@gmail.com

# Server
PORT=5001

# Security
RATE_LIMIT_ENABLED=true
CORS_ORIGINS=*
```

### Gmail App Password (required for email OTP)

1. Go to https://myaccount.google.com/apppasswords
2. Sign in (2FA must be enabled)
3. Create app password for "Mail"
4. Copy the 16-character password into `EMAIL_PASS`

If you skip email setup, OTP features won't send emails (but the rest works fine).

---

## Step 5: Build All Packages

```bash
npm run build
```

This builds all 6 packages using Turborepo:
- `@securepool/core`
- `@securepool/application`
- `@securepool/infrastructure`
- `@securepool/persistence`
- `@securepool/api`
- `@securepool/react-sdk`

---

## Step 6: Start Backend

```bash
cd apps/demo-backend
npx ts-node src/index.ts
```

You should see:

```
SecurePool API running on port 5001
```

Verify:

```bash
curl http://localhost:5001/health
# → {"status":"ok"}
```

### API Documentation (Swagger UI)

Open in your browser:

```
http://localhost:5001/docs
```

This gives you an interactive API explorer where you can:

- See all endpoints with request/response schemas
- Try any API live by clicking "Try it out"
- Authenticate by clicking the **Authorize** button (top right) and pasting your JWT access token
- View the raw OpenAPI spec at `http://localhost:5001/docs.json`

**How to use authenticated endpoints in Swagger:**

1. First call `POST /auth/login` with your email + password
2. Copy the `accessToken` from the response
3. Click the **Authorize** button (lock icon at top)
4. Paste the token and click "Authorize"
5. Now all authenticated endpoints (Sessions, Change Password) will work
```

---

## Step 7: Start Frontend

Open a **new terminal**:

```bash
cd apps/demo-frontend
npx vite
```

Opens at http://localhost:5173

---

## Step 8: Test the Full Flow

### Register a new user

1. Open http://localhost:5173/signup
2. Enter email and password (min 8 chars)
3. Check your email for the 6-digit OTP
4. Enter OTP on the verification page
5. You're logged in and redirected to the dashboard

### Login with password

1. Go to http://localhost:5173/login
2. Enter email and password

### Login with OTP

1. Go to http://localhost:5173/otp-login
2. Enter your email
3. Check email for OTP code
4. Enter the code

### Forgot password

1. Go to http://localhost:5173/forgot-password
2. Enter your email
3. Check email for OTP
4. Enter OTP, then set new password

### Change password

1. Login and go to dashboard
2. Click your avatar (top right)
3. Click "Change password"
4. Enter old password and new password

### Switch accounts

1. Login with one account
2. Click avatar → "Add another account"
3. Login with a different email
4. Click avatar → click any stored account to switch

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register + send OTP |
| POST | `/auth/verify-email` | No | Verify OTP + create user |
| POST | `/auth/login` | No | Login with password |
| POST | `/auth/otp/request` | No | Request OTP for login |
| POST | `/auth/otp/verify` | No | Verify OTP + login |
| POST | `/auth/refresh` | No | Refresh token |
| POST | `/auth/google` | No | Google SSO login |
| POST | `/auth/forgot-password` | No | Send password reset OTP |
| POST | `/auth/reset-password` | No | Reset password with OTP |
| POST | `/auth/change-password` | Yes | Change password (old + new) |
| GET | `/sessions` | Yes | List active sessions |
| DELETE | `/sessions/:id` | Yes | Revoke a session |
| DELETE | `/sessions` | Yes | Revoke all sessions |

All `/auth/*` routes require the `x-tenant-id` header.

Authenticated routes require: `Authorization: Bearer <access_token>`

### Example: Register + Login via curl

```bash
# Register
curl -X POST http://localhost:5001/auth/register \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: default" \
  -d '{"email":"test@example.com","password":"MyPass@1234"}'

# Login
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: default" \
  -d '{"email":"test@example.com","password":"MyPass@1234"}'
```

---

## Project Structure

```
securepool/
├── packages/                    # NPM library packages
│   ├── core/                    # Entities, enums (zero dependencies)
│   ├── application/             # Interfaces, AuthService, business logic
│   ├── infrastructure/          # JWT, bcrypt, OTP, email (nodemailer)
│   ├── persistence/             # MongoDB (mongoose) + PostgreSQL (prisma)
│   ├── api/                     # Express routes, middleware, createSecurePool()
│   └── react-sdk/               # SecurePoolProvider, useAuth, UI components
│
├── apps/                        # Runnable applications
│   ├── demo-backend/            # Express server using @securepool/api
│   └── demo-frontend/           # React app using @securepool/react-sdk
│
├── package.json                 # Monorepo root (npm workspaces)
├── tsconfig.base.json           # Shared TypeScript config
├── turbo.json                   # Turborepo build pipeline
├── .env                         # Environment variables (not in git)
├── private.pem                  # JWT private key (not in git)
└── public.pem                   # JWT public key (not in git)
```

---

## Common Issues

### Port 5001 already in use

```bash
lsof -ti:5001 | xargs kill -9
```

### Port 5000 used by AirPlay (macOS)

We use port 5001 to avoid this. Or disable AirPlay Receiver in System Settings.

### MongoDB connection failed

Make sure MongoDB is running:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

### OTP email not received

- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- Gmail requires an App Password (not your regular password)
- Enable 2FA on your Google account first

### Build errors after changing code

Rebuild all packages:

```bash
npm run build
```

Then restart the backend.

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages |
| `npm run clean` | Clean all dist folders |
| `npx turbo run build --filter=@securepool/api` | Build single package |
| `cd apps/demo-backend && npx ts-node src/index.ts` | Start backend |
| `cd apps/demo-frontend && npx vite` | Start frontend |
| `lsof -ti:5001 \| xargs kill -9` | Kill process on port |
