import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@securepool/react-sdk";
import { useNavigate, Link } from "react-router-dom";

type Step = "email" | "otp" | "newPassword";

export default function ForgotPasswordPage() {
  const { forgotPassword, resetPassword, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { clearError(); }, [clearError]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setStep("otp");
    } catch {
      // error in context
    }
  };

  const handleVerifyAndReset = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (step === "otp") {
      setStep("newPassword");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    try {
      await resetPassword(email, code, newPassword);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      // error in context
    }
  };

  const displayError = localError || error;

  // Step 1: Enter email
  if (step === "email") {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <h1>Forgot Password</h1>
          <p className="subtitle">Enter your email and we'll send you a reset code</p>

          {displayError && <div className="error-msg">{displayError}</div>}

          <form onSubmit={handleSendOtp}>
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
              {isLoading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter OTP
  if (step === "otp") {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <h1>Enter Reset Code</h1>
          <p className="subtitle">
            Code sent to <strong>{email}</strong>
          </p>

          {displayError && <div className="error-msg">{displayError}</div>}

          <form onSubmit={handleVerifyAndReset}>
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
              Next
            </button>
          </form>

          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 12 }}
            onClick={() => setStep("email")}
          >
            Use different email
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Set new password
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Set New Password</h1>
        <p className="subtitle">Create a new password for your account</p>

        {success && <div className="success-msg">Password reset! Redirecting to login...</div>}
        {displayError && <div className="error-msg">{displayError}</div>}

        <form onSubmit={handleVerifyAndReset}>
          <div className="form-group">
            <label htmlFor="newPass">New Password</label>
            <input
              id="newPass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              disabled={isLoading || success}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPass">Confirm Password</label>
            <input
              id="confirmPass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              disabled={isLoading || success}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading || success}>
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
