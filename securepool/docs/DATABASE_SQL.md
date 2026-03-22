# SecurePool — PostgreSQL / MySQL Setup Guide

This guide covers using SecurePool with **PostgreSQL** or **MySQL** via Prisma ORM.

---

## How It Works

SecurePool uses **Prisma** as the ORM for SQL databases. When you set `type: "postgres"`, the persistence layer uses Prisma Client to interact with your SQL database.

```ts
createSecurePool({
  database: {
    type: "postgres",
    url: "postgresql://user:password@localhost:5432/securepool"
  },
  ...
})
```

Unlike MongoDB, SQL databases **require a migration step** to create tables before first use.

---

## PostgreSQL

### Option 1: Local PostgreSQL (Development)

#### Install

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16
```

#### Create Database and User

```bash
# Connect as default user
psql postgres
```

```sql
-- Create database
CREATE DATABASE securepool;

-- Create user with password
CREATE USER securepool_user WITH PASSWORD 'SecurePool@123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE securepool TO securepool_user;

-- Connect to the database and grant schema access
\c securepool
GRANT ALL ON SCHEMA public TO securepool_user;

\q
```

#### Verify Connection

```bash
psql "postgresql://securepool_user:SecurePool%40123@localhost:5432/securepool"
```

#### .env Configuration

```env
DB_TYPE=postgres
DB_URL=postgresql://securepool_user:SecurePool%40123@localhost:5432/securepool
```

---

### Option 2: Cloud PostgreSQL (Production)

#### Supabase (Free tier — recommended)

1. Go to https://supabase.com → Create new project
2. Go to **Settings** → **Database** → **Connection string**
3. Copy the URI (starts with `postgresql://`)

```env
DB_TYPE=postgres
DB_URL=postgresql://postgres:your-password@db.xxxx.supabase.co:5432/postgres
```

#### AWS RDS

1. Create an RDS PostgreSQL instance
2. Use the endpoint provided by AWS

```env
DB_TYPE=postgres
DB_URL=postgresql://admin:password@your-instance.region.rds.amazonaws.com:5432/securepool
```

#### Railway (built-in PostgreSQL)

1. In your Railway project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway auto-sets `DATABASE_URL`

```env
DB_TYPE=postgres
DB_URL=${{ Postgres.DATABASE_URL }}
```

#### Neon (serverless PostgreSQL)

1. Go to https://neon.tech → Create project
2. Copy the connection string

```env
DB_TYPE=postgres
DB_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/securepool?sslmode=require
```

---

## MySQL

### Change Prisma Schema Provider

By default, the Prisma schema is set to `postgresql`. To use MySQL, update the schema:

Edit `packages/persistence/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Install MySQL

```bash
# macOS
brew install mysql
brew services start mysql
```

### Create Database and User

```bash
mysql -u root
```

```sql
CREATE DATABASE securepool;
CREATE USER 'securepool_user'@'localhost' IDENTIFIED BY 'SecurePool@123';
GRANT ALL PRIVILEGES ON securepool.* TO 'securepool_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### .env Configuration

```env
DB_TYPE=postgres
DB_URL=mysql://securepool_user:SecurePool%40123@localhost:3306/securepool
```

> Note: Even though it's MySQL, use `DB_TYPE=postgres` because SecurePool uses Prisma for all SQL databases. The `postgres` type tells SecurePool to use the Prisma code path (not MongoDB).

### Cloud MySQL Options

| Provider | URL Format |
|---|---|
| PlanetScale | `mysql://user:pass@region.connect.psdb.cloud/securepool?sslaccept=strict` |
| AWS RDS MySQL | `mysql://admin:pass@instance.region.rds.amazonaws.com:3306/securepool` |
| DigitalOcean | `mysql://user:pass@db-mysql-xxx.ondigitalocean.com:25060/securepool?ssl-mode=REQUIRED` |

---

## Running Migrations (Required for SQL)

After setting your `DB_URL`, you must run Prisma migrations to create the tables.

### First Time Setup

```bash
cd packages/persistence

# Set the DATABASE_URL for Prisma
export DATABASE_URL="postgresql://securepool_user:SecurePool%40123@localhost:5432/securepool"

# Generate Prisma Client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name init
```

### Production Migration

```bash
export DATABASE_URL="postgresql://user:pass@production-host:5432/securepool"
npx prisma migrate deploy
```

### View Database in Prisma Studio (GUI)

```bash
cd packages/persistence
export DATABASE_URL="postgresql://..."
npx prisma studio
```

Opens a web UI at http://localhost:5555 to browse your data.

---

## Database Schema

Prisma creates these tables automatically during migration:

### Tables

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users      │     │    roles      │     │  user_roles   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)       │     │ id (PK)       │     │ userId (FK)   │
│ tenantId      │◄───┐│ name          │◄───┐│ roleId (FK)   │
│ email         │    ││               │    │└──────────────┘
│ passwordHash  │    │└──────────────┘    │
│ isVerified    │    │                     │
│ createdAt     │    │┌──────────────┐    │
└──────────────┘    ││ sessions      │    │
                     │├──────────────┤    │
                     ││ id (PK)       │    │
                     ├│ userId (FK)   │    │
                     ││ device        │    │
                     ││ ip            │    │
                     ││ createdAt     │    │
                     ││ isActive      │    │
                     │└──────────────┘    │
                     │                     │
                     │┌──────────────┐    │
                     ││ audit_logs    │    │
                     │├──────────────┤    │
                     ││ id (PK)       │    │
                     └│ userId (FK)   │    │
                      │ tenantId      │    │
                      │ action        │    │
                      │ ip            │    │
                      │ metadata (JSON│    │
                      │ timestamp     │    │
                      └──────────────┘    │
                                           │
┌──────────────┐     ┌──────────────┐     │
│refresh_tokens │     │ otp_codes     │     │
├──────────────┤     ├──────────────┤     │
│ id (PK)       │     │ id (PK)       │     │
│ userId        │     │ userId        │     │
│ tokenHash     │     │ code          │     │
│ expiresAt     │     │ expiresAt     │     │
│ isRevoked     │     │ attempts      │     │
└──────────────┘     └──────────────┘     │
```

### Column Details

**users**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key, auto-generated |
| tenantId | String | Indexed |
| email | String | Unique per tenant (`email + tenantId`) |
| passwordHash | String? | Nullable (Google SSO users have no password) |
| isVerified | Boolean | Default: false |
| createdAt | DateTime | Default: now() |

**roles**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| name | String | Unique (e.g., "admin", "user") |

**user_roles** (junction table)

| Column | Type | Constraints |
|---|---|---|
| userId | UUID | FK → users.id, cascade delete |
| roleId | UUID | FK → roles.id, cascade delete |
| | | Composite PK: (userId, roleId) |

**refresh_tokens**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| userId | String | Indexed |
| tokenHash | String | Indexed (for fast lookup) |
| expiresAt | DateTime | Token expiry (30 days) |
| isRevoked | Boolean | Default: false |

**otp_codes**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| userId | String | Indexed |
| code | String | 6-digit code |
| expiresAt | DateTime | Code expiry (10 minutes) |
| attempts | Int | Default: 0 (max 3 attempts) |

**sessions**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| userId | String | FK → users.id, indexed |
| device | String | e.g., "Chrome on Mac OS" |
| ip | String | Client IP address |
| createdAt | DateTime | Default: now() |
| isActive | Boolean | Default: true |

**audit_logs**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| userId | String | FK → users.id, indexed |
| tenantId | String | Indexed |
| action | String | e.g., "LOGIN_SUCCESS", "REGISTER" |
| ip | String | Client IP |
| metadata | JSON | Additional data |
| timestamp | DateTime | Default: now() |

---

## PostgreSQL URL Format Reference

| Scenario | URL Format |
|---|---|
| Local | `postgresql://user:pass@localhost:5432/securepool` |
| With SSL | `postgresql://user:pass@host:5432/securepool?sslmode=require` |
| Supabase | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| AWS RDS | `postgresql://admin:pass@instance.region.rds.amazonaws.com:5432/securepool` |
| Neon | `postgresql://user:pass@ep-xxx.neon.tech/securepool?sslmode=require` |
| Railway | Auto-set via `${{ Postgres.DATABASE_URL }}` |

---

## Switching from MongoDB to PostgreSQL

If you're already running SecurePool with MongoDB and want to switch:

### Step 1: Update `.env`

```env
# Before (MongoDB)
DB_TYPE=mongo
DB_URL=mongodb://localhost:27017/securepool

# After (PostgreSQL)
DB_TYPE=postgres
DB_URL=postgresql://securepool_user:SecurePool%40123@localhost:5432/securepool
```

### Step 2: Run Migrations

```bash
cd packages/persistence
export DATABASE_URL="postgresql://securepool_user:SecurePool%40123@localhost:5432/securepool"
npx prisma migrate dev --name init
```

### Step 3: Restart Backend

```bash
cd apps/demo-backend
npx ts-node src/index.ts
```

That's it. No code changes needed. All auth features (login, OTP, sessions, etc.) work the same way.

### Data Migration

SecurePool does **not** auto-migrate data between databases. If you need to move existing users from MongoDB to PostgreSQL, you'll need to export from Mongo and import to PostgreSQL manually.

---

## Backup & Restore

### PostgreSQL

```bash
# Backup
pg_dump "postgresql://user:pass@localhost:5432/securepool" > backup.sql

# Restore
psql "postgresql://user:pass@localhost:5432/securepool" < backup.sql
```

### MySQL

```bash
# Backup
mysqldump -u securepool_user -p securepool > backup.sql

# Restore
mysql -u securepool_user -p securepool < backup.sql
```

---

## Troubleshooting

### "relation does not exist"

Migrations haven't been run:

```bash
cd packages/persistence
npx prisma migrate dev
```

### "authentication failed for user"

Check your credentials and ensure the user has access to the database:

```bash
psql "postgresql://user:pass@localhost:5432/securepool"
```

### "SSL required"

Cloud providers often require SSL. Add to your URL:

```
?sslmode=require
```

### "Prisma Client not generated"

```bash
cd packages/persistence
npx prisma generate
```

### Reset database (delete all data)

```bash
cd packages/persistence
npx prisma migrate reset
```

> Warning: This deletes ALL data. Use only in development.

---

## Comparison: MongoDB vs PostgreSQL

| Feature | MongoDB | PostgreSQL |
|---|---|---|
| Setup complexity | Easier (no migrations) | Requires `prisma migrate` |
| Schema enforcement | Flexible (schemaless) | Strict (type-safe) |
| Joins | Manual (application-level) | Native SQL joins |
| Transactions | Supported (4.0+) | Full ACID support |
| JSON support | Native (BSON) | JSONB column type |
| Best for | Rapid prototyping, flexibility | Data integrity, complex queries |
| Free cloud | Atlas M0 (512MB) | Supabase (500MB), Neon (512MB) |
| ORM used | Mongoose | Prisma |
| Code changes needed | None | None |

Both are fully supported. Choose based on your team's preference and requirements.
