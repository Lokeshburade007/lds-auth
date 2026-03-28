import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@securepool/react-sdk";
import { useNavigate, Link } from "react-router-dom";

export default function OtpLoginPage() {
  const { requestOtp, verifyOtp, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { clearError(); }, [clearError]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await requestOtp(email);
      setOtpSent(true);
    } catch {
      // error set in context
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verifyOtp(email, code);
      navigate("/dashboard");
    } catch {
      // error set in context
    }
  };

  if (!otpSent) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <h1>OTP Login</h1>
          <p className="subtitle">We'll send a 6-digit code to your email</p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleRequestOtp}>
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
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/login">Back to password login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Enter OTP</h1>
        <p className="subtitle">
          Code sent to <strong>{email}</strong>. Check your inbox.
        </p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleVerifyOtp}>
          <div className="form-group">
            <label htmlFor="otp">6-digit Code</label>
            <input
              id="otp"
              type="text"
              className="otp-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading || code.length !== 6}>
            {isLoading ? "Verifying..." : "Verify & Sign In"}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-outline"
          style={{ marginTop: 12 }}
          onClick={() => {
            setOtpSent(false);
            setCode("");
          }}
          disabled={isLoading}
        >
          Use different email
        </button>
      </div>
    </div>
  );
}
