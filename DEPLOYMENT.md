# SecurePool - Deployment Guide

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Frontend        │────▶│  Backend API      │────▶│  MongoDB     │
│  (Vercel)        │     │  (Railway/Render) │     │  (Atlas)     │
│  Static files    │     │  Node.js server   │     │  Cloud DB    │
└─────────────────┘     └──────────────────┘     └─────────────┘
  apps/demo-frontend      apps/demo-backend        MongoDB Atlas
```

### Deployment Targets

| What | Platform | Why |
|------|----------|-----|
| Database | MongoDB Atlas | Free cloud DB, no server to manage |
| Backend API | Railway / Render | Node.js hosting, auto-deploys from GitHub |
| Frontend | Vercel / Netlify | Free static hosting, auto-deploys from GitHub |
| NPM Packages | npmjs.com | So other devs can install your library |

---

## Prerequisites

Before deploying, make sure:

- [ ] Your code is pushed to a **GitHub repository**
- [ ] You have accounts on [MongoDB Atlas](https://cloud.mongodb.com), [Railway](https://railway.app), and [Vercel](https://vercel.com)
- [ ] Your project builds locally (`npm run build` succeeds)
- [ ] Your `.pem` files are ready (you'll convert them to env vars)

---

## Step 1: MongoDB Atlas (Cloud Database)

### 1.1 Create Cluster

1. Go to https://cloud.mongodb.com
2. Click **"Build a Database"**
3. Choose **M0 Free Tier**
4. Select region closest to your backend (e.g., AWS Mumbai for India)
5. Click **Create**

### 1.2 Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Set:
   - Username: `securepool-user`
   - Password: `SecurePool@123`
   - Role: **Read and write to any database**
4. Click **Add User**

### 1.3 Allow Network Access

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (`0.0.0.0/0`)
4. Click **Confirm**

> For production, restrict to your backend server's IP only.

### 1.4 Get Connection String

1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Drivers"**
4. Copy the connection string:

```
mongodb+srv://securepool-user:SecurePool%40123@cluster0.xxxxx.mongodb.net/securepool
```

> Replace `cluster0.xxxxx` with your actual cluster address.
> The `@` in password is encoded as `%40`.

### 1.5 Verify Connection

Test from your terminal:

```bash
mongosh "mongodb+srv://securepool-user:SecurePool%40123@cluster0.xxxxx.mongodb.net/securepool"
```

If it connects, your database is ready.

---

## Step 2: Prepare JWT Keys for Production

Locally, you use `.pem` files. In production, you pass the key content as environment variables.

### Convert .pem files to single-line format

Run these in your `securepool/` directory:

```bash
# Private key (copy the entire output)
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem
```

```bash
# Public key (copy the entire output)
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem
```

Each command outputs a single line like:

```
-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n
```

**Save both outputs** — you'll paste them as env vars in Railway.

---

## Step 3: Deploy Backend on Railway

### 3.1 Create Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Choose **"Deploy from GitHub Repo"**
4. Select your repository
5. Railway auto-detects Node.js

### 3.2 Configure Build & Start

Go to your service → **Settings** tab:

| Setting | Value |
|---------|-------|
| Root Directory | `/` (leave empty, monorepo root) |
| Build Command | `npm ci && npx turbo run build --filter=@securepool/* && cd apps/demo-backend && npx tsc` |
| Start Command | `node apps/demo-backend/dist/index.js` |

### 3.3 Add Environment Variables

Go to **Variables** tab and add each:

```env
# Database
DB_TYPE=mongo
DB_URL=mongodb+srv://securepool-user:SecurePool%40123@cluster0.xxxxx.mongodb.net/securepool

# JWT (paste the single-line output from Step 2)
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...\n-----END RSA PRIVATE KEY-----\n
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgk...\n-----END PUBLIC KEY-----\n

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=demandon.ps@gmail.com
EMAIL_PASS=hjggfnfiskzzrnuy
EMAIL_FROM=demandon.ps@gmail.com

# Server
PORT=5001
CORS_ORIGINS=*
RATE_LIMIT_ENABLED=true
```

> Set `CORS_ORIGINS=*` for now. Update it after getting your Vercel frontend URL.

### 3.4 Deploy

Click **"Deploy"**. Railway builds and starts your server.

### 3.5 Get Your Backend URL

After deployment, Railway gives you a URL:

```
https://securepool-production.up.railway.app
```

### 3.6 Verify

```bash
curl https://securepool-production.up.railway.app/health
# → {"status":"ok"}
```

Check Swagger docs:

```
https://securepool-production.up.railway.app/docs
```

---

## Step 4: Deploy Frontend on Vercel

### 4.1 Create Project

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. **Import** your GitHub repository

### 4.2 Configure Build

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `apps/demo-frontend` |
| Build Command | `cd ../.. && npm ci && npx turbo run build --filter=@securepool/react-sdk && cd apps/demo-frontend && npx vite build` |
| Output Directory | `dist` |

### 4.3 Add Environment Variable

```env
VITE_API_URL=https://securepool-production.up.railway.app
```

### 4.4 Deploy

Click **"Deploy"**. Vercel builds the static React app.

### 4.5 Get Your Frontend URL

Vercel gives you:

```
https://securepool.vercel.app
```

### 4.6 Update CORS on Railway

Go back to Railway → **Variables** → Update:

```env
CORS_ORIGINS=https://securepool.vercel.app
```

Railway auto-redeploys with the new CORS setting.

### 4.7 Verify

Open `https://securepool.vercel.app` — you should see the login page. Register a new account, check your email for OTP, and login.

---

## Step 5: Publish NPM Packages (Optional)

This lets other developers install your library with `npm install @securepool/api`.

### 5.1 Create npm Account

1. Go to https://www.npmjs.com/signup
2. Create an account

### 5.2 Login from Terminal

```bash
npm login
```

### 5.3 Create npm Organization (for scoped packages)

1. Go to https://www.npmjs.com/org/create
2. Create organization named `securepool`
3. This reserves the `@securepool/` scope

### 5.4 Publish All Packages

```bash
cd securepool

# Publish in dependency order
cd packages/core && npm publish --access public && cd ../..
cd packages/application && npm publish --access public && cd ../..
cd packages/infrastructure && npm publish --access public && cd ../..
cd packages/persistence && npm publish --access public && cd ../..
cd packages/api && npm publish --access public && cd ../..
cd packages/react-sdk && npm publish --access public && cd ../..
```

### 5.5 Verify

```bash
npm info @securepool/api
npm info @securepool/react-sdk
```

### 5.6 How Others Use It

**Their backend:**

```bash
npm install @securepool/api
```

```ts
import { createSecurePool } from "@securepool/api";

const { app } = await createSecurePool({
  database: { type: "mongo", url: process.env.DB_URL },
  jwt: { privateKey: "...", publicKey: "..." },
});

app.listen(3000);
```

**Their frontend:**

```bash
npm install @securepool/react-sdk
```

```tsx
import { SecurePoolProvider, LoginForm } from "@securepool/react-sdk";

<SecurePoolProvider config={{ apiBaseUrl: "https://api.example.com", tenantId: "default" }}>
  <LoginForm />
</SecurePoolProvider>
```

---

## Alternative: Deploy with Docker

If you prefer Docker (for AWS ECS, DigitalOcean, etc.):

### Build

```bash
cd securepool
docker build -f apps/demo-backend/Dockerfile -t securepool-api .
```

### Run

```bash
docker run -p 5001:5001 \
  -e DB_TYPE=mongo \
  -e DB_URL="mongodb+srv://..." \
  -e JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..." \
  -e JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..." \
  -e EMAIL_HOST=smtp.gmail.com \
  -e EMAIL_PORT=587 \
  -e EMAIL_SECURE=false \
  -e EMAIL_USER=demandon.ps@gmail.com \
  -e EMAIL_PASS=hjggfnfiskzzrnuy \
  -e EMAIL_FROM=demandon.ps@gmail.com \
  -e PORT=5001 \
  -e CORS_ORIGINS="*" \
  -e RATE_LIMIT_ENABLED=true \
  securepool-api
```

### Push to Docker Hub

```bash
docker tag securepool-api yourusername/securepool-api:latest
docker push yourusername/securepool-api:latest
```

---

## Post-Deployment Checklist

After deploying, verify everything works:

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `GET /docs` shows Swagger UI
- [ ] Register a new user (OTP email received)
- [ ] Verify email with OTP
- [ ] Login with email/password
- [ ] Login with OTP
- [ ] Forgot password flow works
- [ ] Change password from dashboard
- [ ] Sessions show up in dashboard
- [ ] Multi-account switching works
- [ ] `CORS_ORIGINS` is set to your Vercel URL (not `*`)

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DB_TYPE` | Yes | `mongo` | Database type: `mongo` or `postgres` |
| `DB_URL` | Yes | `mongodb+srv://...` | Database connection string |
| `JWT_PRIVATE_KEY` | Yes | `-----BEGIN RSA...` | RSA private key (single line, `\n` for newlines) |
| `JWT_PUBLIC_KEY` | Yes | `-----BEGIN PUBLIC...` | RSA public key (single line, `\n` for newlines) |
| `EMAIL_HOST` | No | `smtp.gmail.com` | SMTP host |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_SECURE` | No | `false` | Use TLS (`true` for port 465) |
| `EMAIL_USER` | No | `you@gmail.com` | SMTP username |
| `EMAIL_PASS` | No | `abcdefghijklmnop` | Gmail App Password |
| `EMAIL_FROM` | No | `you@gmail.com` | Sender email address |
| `PORT` | No | `5001` | Server port (Railway sets this automatically) |
| `CORS_ORIGINS` | Yes | `https://app.vercel.app` | Allowed frontend origin |
| `RATE_LIMIT_ENABLED` | No | `true` | Enable rate limiting |

### Frontend (Vercel)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `https://api.railway.app` | Backend API URL |
| `VITE_TENANT_ID` | No | `default` | Default tenant ID |

---

## Updating After Deployment

### Push code changes

```bash
git add .
git commit -m "your changes"
git push
```

Railway and Vercel auto-redeploy on push.

### Update npm packages

```bash
# Bump version in each package.json, then:
cd packages/core && npm publish --access public
# ... repeat for changed packages
```

---

## Cost Summary

| Service | Free Tier | Paid |
|---------|-----------|------|
| MongoDB Atlas | 512MB storage, shared cluster | $9/mo for dedicated |
| Railway | 500 hours/month, 8GB RAM | $5/mo for always-on |
| Vercel | Unlimited static sites | $20/mo for team features |
| npm | Unlimited public packages | Free |

**Total for hobby/MVP: $0/month**
