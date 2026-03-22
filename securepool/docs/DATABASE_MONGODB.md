# SecurePool — MongoDB Setup Guide

This guide covers using SecurePool with **MongoDB** (the default database).

---

## How It Works

SecurePool uses **Mongoose** as the ODM for MongoDB. When you set `type: "mongo"`, the persistence layer auto-creates all collections and indexes.

```ts
createSecurePool({
  database: {
    type: "mongo",
    url: "mongodb://localhost:27017/securepool"
  },
  ...
})
```

No migration step needed — Mongoose creates collections on first use.

---

## Option 1: Local MongoDB (Development)

### Install MongoDB

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
```

### Start MongoDB

**Without authentication (simplest):**

```bash
brew services start mongodb-community
```

**With authentication (production-like):**

```bash
# Create data directory
mkdir -p ~/mongodb-data

# Start with auth enabled
mongod --dbpath ~/mongodb-data --auth
```

### Create Database User (if using auth)

Open a new terminal:

```bash
mongosh
```

```js
// Create the database and user
use securepool

db.createUser({
  user: "securepool-user",
  pwd: "SecurePool@123",
  roles: [{ role: "readWrite", db: "securepool" }]
})

exit
```

Verify:

```bash
mongosh "mongodb://securepool-user:SecurePool%40123@localhost:27017/securepool?authSource=securepool"
```

### .env Configuration

**Without auth:**

```env
DB_TYPE=mongo
DB_URL=mongodb://localhost:27017/securepool
```

**With auth:**

```env
DB_TYPE=mongo
DB_URL=mongodb://securepool-user:SecurePool%40123@localhost:27017/securepool?authSource=securepool
```

> Note: `@` in passwords must be encoded as `%40`.

---

## Option 2: MongoDB Atlas (Production / Cloud)

### Step 1: Create Free Cluster

1. Go to https://cloud.mongodb.com
2. Sign up / Sign in
3. Click **"Build a Database"**
4. Select **M0 Free Tier** (512MB, free forever)
5. Choose your region (closest to your backend server)
6. Click **Create**

### Step 2: Create Database User

1. Go to **Database Access** → **Add New Database User**
2. Set:
   - Username: `securepool-user`
   - Password: `SecurePool@123` (or generate a strong one)
   - Role: **Read and write to any database**
3. Click **Add User**

### Step 3: Allow Network Access

1. Go to **Network Access** → **Add IP Address**
2. For development: Click **"Allow Access from Anywhere"** (`0.0.0.0/0`)
3. For production: Add your backend server's IP only
4. Click **Confirm**

### Step 4: Get Connection String

1. Go to **Database** → Click **"Connect"**
2. Choose **"Drivers"** → Node.js
3. Copy the connection string:

```
mongodb+srv://securepool-user:<password>@cluster0.xxxxx.mongodb.net/securepool?retryWrites=true&w=majority
```

4. Replace `<password>` with your URL-encoded password

### .env Configuration

```env
DB_TYPE=mongo
DB_URL=mongodb+srv://securepool-user:SecurePool%40123@cluster0.xxxxx.mongodb.net/securepool?retryWrites=true&w=majority
```

### Verify Connection

```bash
mongosh "mongodb+srv://securepool-user:SecurePool%40123@cluster0.xxxxx.mongodb.net/securepool"
```

---

## Collections Created Automatically

When SecurePool starts with MongoDB, these collections are auto-created:

| Collection | Description |
|---|---|
| `users` | User accounts (email, password hash, tenant, verified status) |
| `roles` | Role definitions (admin, user, etc.) |
| `userroles` | User-role assignments (many-to-many) |
| `refreshtokens` | JWT refresh tokens (for token rotation) |
| `otpcodes` | OTP codes (for email verification, login, password reset) |
| `sessions` | Active sessions (device, IP, timestamp) |
| `auditlogs` | Audit trail (login, register, password change events) |

### Indexes

The following indexes are auto-created for performance:

| Collection | Index | Purpose |
|---|---|---|
| `users` | `{ email: 1, tenantId: 1 }` unique | Prevent duplicate emails per tenant |
| `users` | `{ tenantId: 1 }` | Fast tenant-scoped queries |
| `refreshtokens` | `{ tokenHash: 1 }` | Fast token lookup on refresh |
| `refreshtokens` | `{ userId: 1 }` | Find all tokens for a user |
| `sessions` | `{ userId: 1 }` | List sessions for a user |
| `otpcodes` | `{ userId: 1 }` | Find OTP for a user |
| `auditlogs` | `{ userId: 1 }` | Audit trail per user |
| `auditlogs` | `{ tenantId: 1 }` | Audit trail per tenant |

---

## MongoDB URL Format Reference

| Scenario | URL Format |
|---|---|
| Local, no auth | `mongodb://localhost:27017/securepool` |
| Local, with auth | `mongodb://user:pass%40123@localhost:27017/securepool?authSource=securepool` |
| Atlas (cloud) | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/securepool` |
| Custom port | `mongodb://localhost:27018/securepool` |
| Replica set | `mongodb://host1:27017,host2:27017/securepool?replicaSet=rs0` |

---

## Backup & Restore

### Backup

```bash
mongodump --uri="mongodb://localhost:27017/securepool" --out=./backup
```

### Restore

```bash
mongorestore --uri="mongodb://localhost:27017/securepool" ./backup/securepool
```

### Atlas Backup

Atlas M0 free tier doesn't include automated backups. For M2+ tiers, backups are automatic. For M0, use `mongodump` manually.

---

## Monitoring

### Check collections via mongosh

```bash
mongosh "mongodb://localhost:27017/securepool"
```

```js
// List all collections
show collections

// Count users
db.users.countDocuments()

// Find a user
db.users.findOne({ email: "test@example.com" })

// List active sessions
db.sessions.find({ isActive: true })

// View recent audit logs
db.auditlogs.find().sort({ timestamp: -1 }).limit(10)
```

### Via MongoDB Compass (GUI)

1. Download from https://www.mongodb.com/products/compass
2. Connect with your URL
3. Browse collections, run queries, view indexes

---

## Troubleshooting

### "Authentication failed"

- Check username/password are correct
- Ensure `authSource` matches the database where the user was created
- URL-encode special characters: `@` → `%40`, `#` → `%23`

### "Connection refused"

```bash
# Check if MongoDB is running
brew services list | grep mongodb
# or
lsof -i:27017
```

### "Duplicate key error"

This means a user with the same email + tenantId already exists. SecurePool normalizes emails (trim + lowercase) to prevent duplicates.

### Slow queries

Check if indexes exist:

```js
db.users.getIndexes()
db.sessions.getIndexes()
```

If missing, restart SecurePool — Mongoose auto-creates them on startup.
