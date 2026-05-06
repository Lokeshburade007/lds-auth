# @securepool/persistence

Persistence layer for the [SecurePool](https://github.com/Lokeshburade007/lds-auth) authentication library:

- **MongoDB** via Mongoose — `MongoUserRepository`, `MongoSessionRepository`, `MongoOtpRepository`, `MongoTokenRepository`, `MongoAuditLogRepository`, `MongoRoleRepository`.
- **PostgreSQL / MySQL** via Prisma — `PrismaUserRepository`, etc.
- `connectMongo(url)` / `disconnectMongo()` connection helpers.
- A `createRepositories({ type, url })` factory for one-line wiring.

You usually consume these through [`@securepool/api`](https://www.npmjs.com/package/@securepool/api).

```bash
npm install @securepool/persistence
```

## License

MIT © Lokesh
