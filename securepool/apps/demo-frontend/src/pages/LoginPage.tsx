import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@securepool/react-sdk";
import { useNavigate, Link } from "react-router-dom";

function getInitials(email: string): string {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

function getAvatarUrl(email: string): string {
  const initials = getInitials(email);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=80&background=3b82f6&color=fff&bold=true&format=svg`;
}

export default function LoginPage() {
  const { login, accounts, switchAccount, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  useEffect(() => { clearError(); }, [clearError]);
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      // error is set in context
    }
  };

  const handleSwitchTo = (accountId: string) => {
    switchAccount(accountId);
    navigate("/dashboard");
    window.location.reload();
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to your SecurePool account</p>

        {/* Show existing logged-in accounts */}
        {accounts.length > 0 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Switch to an existing account
              </div>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => handleSwitchTo(account.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid #334155",
                    borderRadius: 10,
                    cursor: "pointer",
                    marginBottom: 6,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59,130,246,0.15)";
                    e.currentTarget.style.borderColor = "#3b82f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(59,130,246,0.06)";
                    e.currentTarget.style.borderColor = "#334155";
                  }}
                >
                  <img
                    src={getAvatarUrl(account.email)}
                    alt=""
                    style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14,
                      color: "#e2e8f0",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {account.email.trim().toLowerCase()}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Click to open dashboard</div>
                  </div>
                  <span style={{
                    fontSize: 18,
                    color: "#3b82f6",
                  }}>
                    →
                  </span>
                </div>
              ))}
            </div>
            <div className="divider"><span>or sign in with another account</span></div>
          </>
        )}

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: "#60a5fa" }}>
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <Link to="/otp-login">
          <button type="button" className="btn btn-outline">
            Sign in with OTP
          </button>
        </Link>

        <div className="auth-links">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
