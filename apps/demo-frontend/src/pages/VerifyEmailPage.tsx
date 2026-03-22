import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@securepool/react-sdk";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function VerifyEmailPage() {
  const { verifyEmail, requestOtp, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { clearError(); }, [clearError]);
  const location = useLocation();
  const passedEmail = (location.state as any)?.email || "";

  const [email] = useState(passedEmail);
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verifyEmail(email, code);
      navigate("/dashboard");
    } catch {
      // error in context
    }
  };

  const handleResend = async () => {
    try {
      await requestOtp(email);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch {
      // error in context
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Verify your email</h1>
        <p className="subtitle">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {resent && <div className="success-msg">OTP resent to your email</div>}
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label htmlFor="otp">Verification Code</label>
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
            {isLoading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-outline"
          style={{ marginTop: 12 }}
          onClick={handleResend}
          disabled={isLoading}
        >
          Resend OTP
        </button>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
