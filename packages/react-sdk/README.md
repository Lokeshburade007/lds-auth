# @securepool/react-sdk

React SDK for the [SecurePool](https://github.com/Lokeshburade007/lds-auth) authentication library — provider, hooks, and pre-built UI components.

```bash
npm install @securepool/react-sdk
```

```tsx
import {
  SecurePoolProvider,
  LoginForm,
  useAuth,
} from "@securepool/react-sdk";

function App() {
  return (
    <SecurePoolProvider
      config={{ apiBaseUrl: "https://api.example.com", tenantId: "default" }}
    >
      <LoginForm onSuccess={() => console.log("Logged in!")} />
    </SecurePoolProvider>
  );
}

function Dashboard() {
  const { user, logout, changePassword } = useAuth();
  // ...
}
```

## What's included

- `<SecurePoolProvider />` — wraps your app, manages auth state in localStorage.
- `useAuth()` hook — `user`, `login`, `register`, `verifyEmail`, `forgotPassword`, `resetPassword`, `changePassword`, `logout`, `error`, `isLoading`, ...
- Pre-built components: `<LoginForm />`, `<SignupForm />`, `<OTPVerification />`, `<GoogleLoginButton />`, `<SessionList />`.

## Peers

`react >=18` and `react-dom >=18`.

## License

MIT © Lokesh
