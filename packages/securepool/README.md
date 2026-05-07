# securepool

All-in-one install of the [SecurePool](https://github.com/Lokeshburade007/lds-auth) authentication library — JWT + OTP + Google SSO, MongoDB / PostgreSQL repositories, drop-in Express API, React SDK.

```bash
npm install securepool
```

That single command brings in every layer:

- `@securepool/core` — entities (User, Role, Session, OTP, RefreshToken)
- `@securepool/application` — services & interfaces (AuthService, RefreshTokenService)
- `@securepool/infrastructure` — adapters (bcrypt, JWT, OTP, Nodemailer, Google SSO)
- `@securepool/persistence` — repositories (Mongoose + Prisma)
- `@securepool/api` — Express routes, middleware, Swagger
- `@securepool/react-sdk` — provider, hooks, UI components

## Subpath imports

Don't pull from the package root in production — go through subpaths so you only ship the layers you need:

```ts
// Backend
import { createSecurePool } from "securepool/api";

// Frontend (React)
import { SecurePoolProvider, useAuth } from "securepool/react-sdk";

// Sharing types
import type { User, Role } from "securepool/core";
```

## Backend example

```ts
import { createSecurePool } from "securepool/api";

const { app } = await createSecurePool({
  database: { type: "mongo", url: process.env.DB_URL! },
  jwt: { privateKey: process.env.JWT_PRIVATE_KEY!, publicKey: process.env.JWT_PUBLIC_KEY! },
  email: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
  },
  security: { enableRateLimit: true, corsOrigins: process.env.CORS_ORIGINS },
});

app.listen(5001);
```

## Frontend example

```tsx
import { SecurePoolProvider, LoginForm, useAuth } from "securepool/react-sdk";

export default function App() {
  return (
    <SecurePoolProvider config={{ apiBaseUrl: "https://api.example.com", tenantId: "default" }}>
      <LoginForm onSuccess={() => console.log("Logged in!")} />
    </SecurePoolProvider>
  );
}
```

## Direct sub-package install

If you only want one layer (e.g. server with no React):

```bash
npm install @securepool/api
```

— same code, smaller install footprint. The `securepool` umbrella just pulls all six.

## License

MIT © Lokesh
