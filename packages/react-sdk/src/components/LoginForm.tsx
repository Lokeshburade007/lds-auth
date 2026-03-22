import React, { useState, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  className,
  style,
}) => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: any) {
      onError?.(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className} style={style}>
      <div>
        <label htmlFor="sp-login-email">Email</label>
        <input
          id="sp-login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="sp-login-password">Password</label>
        <input
          id="sp-login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />
      </div>
      {error && (
        <div role="alert" style={{ color: "red" }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
};
