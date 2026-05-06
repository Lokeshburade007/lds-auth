# @securepool/api

Drop-in Express authentication API — the main entry point of the [SecurePool](https://github.com/Lokeshburade007/lds-auth) library.

```bash
npm install @securepool/api
```

```ts
import { createSecurePool } from "@securepool/api";

const { app } = await createSecurePool({
  database: { type: "mongo", url: "mongodb://localhost:27017/myapp" },
  jwt: { privateKey: "...", publicKey: "..." },
  email: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
  },
  security: { enableRateLimit: true, corsOrigins: "https://yourapp.com" },
});

app.listen(5001);
```

You immediately get:

| Method | Endpoint                  | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| POST   | `/auth/register`          | Register + send verification OTP     |
| POST   | `/auth/verify-email`      | Verify OTP and create the account    |
| POST   | `/auth/login`             | Login with email + password          |
| POST   | `/auth/otp/request`       | Request OTP for login                |
| POST   | `/auth/otp/verify`        | Verify OTP and login                 |
| POST   | `/auth/google`            | Google SSO login                     |
| POST   | `/auth/refresh`           | Refresh access token                 |
| POST   | `/auth/forgot-password`   | Send password reset OTP              |
| POST   | `/auth/reset-password`    | Reset password with OTP              |
| POST   | `/auth/change-password`   | Change password (authenticated)      |
| GET    | `/sessions`               | List active sessions                 |
| DELETE | `/sessions/:id`           | Revoke a session                     |
| DELETE | `/sessions`               | Revoke all sessions                  |
| GET    | `/health`                 | Health check                         |
| GET    | `/docs`                   | Swagger / OpenAPI docs               |

All `/auth/*` routes require a `x-tenant-id` header. Authenticated routes require `Authorization: Bearer <accessToken>`.

See the full guide and architecture notes at [github.com/Lokeshburade007/lds-auth](https://github.com/Lokeshburade007/lds-auth).

## License

MIT © Lokesh
