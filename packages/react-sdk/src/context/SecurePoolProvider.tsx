import React, { useState, useCallback, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { SecurePoolConfig, AuthUser, AuthSession, StoredAccount } from "../types";

interface SecurePoolProviderProps {
  config: SecurePoolConfig;
  children: React.ReactNode;
}

// ---- LocalStorage helpers ----

function getAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("sp_accounts") || "[]");
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]): void {
  localStorage.setItem("sp_accounts", JSON.stringify(accounts));
}

function getActiveAccountId(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("sp_active_account")
    : null;
}

function setActiveAccountId(id: string): void {
  localStorage.setItem("sp_active_account", id);
}

function addOrUpdateAccount(account: StoredAccount): void {
  const accounts = getAccounts();
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  saveAccounts(accounts);
  setActiveAccountId(account.id);
}

function removeAccount(accountId: string): void {
  const accounts = getAccounts().filter((a) => a.id !== accountId);
  saveAccounts(accounts);
}

function getActiveAccount(): StoredAccount | null {
  const activeId = getActiveAccountId();
  if (!activeId) return null;
  return getAccounts().find((a) => a.id === activeId) || null;
}

function getAccessToken(): string | null {
  return getActiveAccount()?.accessToken || null;
}

function getRefreshTokenValue(): string | null {
  return getActiveAccount()?.refreshToken || null;
}

function setTokensForAccount(
  userId: string,
  email: string,
  accessToken: string,
  refreshToken: string
): void {
  addOrUpdateAccount({ id: userId, email, accessToken, refreshToken });
}

function clearActiveAccount(): void {
  const activeId = getActiveAccountId();
  if (activeId) removeAccount(activeId);
  localStorage.removeItem("sp_active_account");
}

// ---- Provider ----

export const SecurePoolProvider: React.FC<SecurePoolProviderProps> = ({
  config,
  children,
}) => {
  // Restore active user synchronously
  const [user, setUser] = useState<AuthUser | null>(() => {
    const account = getActiveAccount();
    if (!account) return null;
    try {
      const payload = JSON.parse(atob(account.accessToken.split(".")[1]));
      if (payload.exp * 1000 > Date.now()) {
        return { id: account.id, email: account.email, isVerified: true };
      }
    } catch {
      // invalid
    }
    return null;
  });
  const [accounts, setAccountsState] = useState<StoredAccount[]>(getAccounts);
  const [isInitialized] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AuthSession[]>([]);

  const clearError = useCallback(() => setError(null), []);

  const refreshAccountsList = useCallback(() => {
    setAccountsState(getAccounts());
  }, []);

  const buildHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-tenant-id": config.tenantId,
    };
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, [config.tenantId]);

  const apiCall = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const res = await fetch(`${config.apiBaseUrl}${path}`, {
        ...options,
        headers: {
          ...buildHeaders(),
          ...((options.headers as Record<string, string>) || {}),
        },
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(res.ok ? "Unexpected response" : `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [config.apiBaseUrl, buildHeaders]
  );

  // ---- Helper to handle login response ----

  const handleLoginResponse = useCallback(
    (data: { accessToken: string; refreshToken: string }, email: string) => {
      const payload = JSON.parse(atob(data.accessToken.split(".")[1]));
      setTokensForAccount(payload.sub, email, data.accessToken, data.refreshToken);
      setUser({ id: payload.sub, email, isVerified: true });
      refreshAccountsList();
    },
    [refreshAccountsList]
  );

  // ---- Auth Actions ----

  const register = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiCall("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        return data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiCall("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        handleLoginResponse(data, email);
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, handleLoginResponse]
  );

  const loginWithGoogle = useCallback(
    async (googleToken: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiCall("/auth/google", {
          method: "POST",
          body: JSON.stringify({ token: googleToken }),
        });
        handleLoginResponse(data, data.email || "");
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, handleLoginResponse]
  );

  const requestOtp = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiCall("/auth/otp/request", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        return data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall]
  );

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiCall("/auth/otp/verify", {
          method: "POST",
          body: JSON.stringify({ email, code }),
        });
        handleLoginResponse(data, email);
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, handleLoginResponse]
  );

  // Verify email after registration
  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiCall("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ email, code }),
        });
        handleLoginResponse(data, email);
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, handleLoginResponse]
  );

  // Forgot password - sends OTP
  const forgotPassword = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCall("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall]
  );

  // Reset password with OTP
  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCall("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email, code, newPassword }),
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall]
  );

  // Change password (authenticated)
  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCall("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ oldPassword, newPassword }),
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall]
  );

  const refreshTokenFn = useCallback(async () => {
    const rt = getRefreshTokenValue();
    if (!rt) return;
    try {
      const data = await apiCall("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: rt }),
      });
      // Update tokens for the active account
      const account = getActiveAccount();
      if (account) {
        setTokensForAccount(account.id, account.email, data.accessToken, data.refreshToken);
        refreshAccountsList();
      }
    } catch {
      clearActiveAccount();
      setUser(null);
      refreshAccountsList();
    }
  }, [apiCall, refreshAccountsList]);

  // Logout current account (removes it from the accounts list)
  const logout = useCallback(() => {
    clearActiveAccount();
    setUser(null);
    setSessions([]);
    refreshAccountsList();
  }, [refreshAccountsList]);

  // Logout a specific account (remove from list, not necessarily current)
  const logoutAccount = useCallback(
    (accountId: string) => {
      const activeId = getActiveAccountId();
      removeAccount(accountId);
      refreshAccountsList();
      // If we removed the current account, clear user state
      if (accountId === activeId) {
        localStorage.removeItem("sp_active_account");
        setUser(null);
        setSessions([]);
      }
    },
    [refreshAccountsList]
  );

  // Switch to another stored account
  const switchAccount = useCallback(
    (accountId: string) => {
      const accts = getAccounts();
      const target = accts.find((a) => a.id === accountId);
      if (!target) return;

      setActiveAccountId(target.id);

      try {
        const payload = JSON.parse(atob(target.accessToken.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: target.id, email: target.email, isVerified: true });
          setSessions([]);
        } else {
          // Token expired, need to refresh
          setUser({ id: target.id, email: target.email, isVerified: true });
          setSessions([]);
        }
      } catch {
        removeAccount(accountId);
        refreshAccountsList();
      }
    },
    [refreshAccountsList]
  );

  // ---- Session Management ----

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiCall("/sessions");
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [apiCall]);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      await apiCall(`/sessions/${sessionId}`, { method: "DELETE" });
      await fetchSessions();
    },
    [apiCall, fetchSessions]
  );

  const revokeAllSessions = useCallback(async () => {
    await apiCall("/sessions", { method: "DELETE" });
    setSessions([]);
  }, [apiCall]);

  // ---- Handle expired token on mount ----

  useEffect(() => {
    const account = getActiveAccount();
    if (account && !user) {
      refreshTokenFn().then(() => {
        const updated = getActiveAccount();
        if (updated) {
          try {
            JSON.parse(atob(updated.accessToken.split(".")[1]));
            setUser({
              id: updated.id,
              email: updated.email,
              isVerified: true,
            });
          } catch {
            clearActiveAccount();
            refreshAccountsList();
          }
        }
      });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialized,
        isLoading,
        error,
        clearError,
        login,
        register,
        verifyEmail,
        loginWithGoogle,
        requestOtp,
        verifyOtp,
        forgotPassword,
        resetPassword,
        changePassword,
        logout,
        logoutAccount,
        switchAccount,
        accounts,
        refreshToken: refreshTokenFn,
        sessions,
        fetchSessions,
        revokeSession,
        revokeAllSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
