import React, { useState, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

interface SignupFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onSuccess,
  onError,
  className,
  style,
}) => {
  const { register, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    try {
      await register(email, password);
      onSuccess?.();
    } catch (err: any) {
      onError?.(err.message);
    }
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className={className} style={style}>
      <div>
        <label htmlFor="sp-signup-email">Email</label>
        <input
          id="sp-signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="sp-signup-password">Password</label>
        <input
          id="sp-signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="sp-signup-confirm">Confirm Password</label>
        <input
          id="sp-signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={isLoading}
        />
      </div>
      {displayError && (
        <div role="alert" style={{ color: "red" }}>
          {displayError}
        </div>
      )}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
};
