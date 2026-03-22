export interface SecurePoolConfig {
  apiBaseUrl: string;
  tenantId: string;
  authType?: "jwt" | "otp" | "google";
}

export interface AuthUser {
  id: string;
  email: string;
  isVerified: boolean;
}

export interface StoredAccount {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  id: string;
  device: string;
  ip: string;
  createdAt: string;
  isActive: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  requestOtp: (email: string) => Promise<any>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
  logoutAccount: (accountId: string) => void;
  switchAccount: (accountId: string) => void;
  accounts: StoredAccount[];
  refreshToken: () => Promise<void>;
  sessions: AuthSession[];
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllSessions: () => Promise<void>;
}
