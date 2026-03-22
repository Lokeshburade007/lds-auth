import React, { useState, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

interface OTPVerificationProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  onSuccess,
  onError,
  className,
  style,
}) => {
  const { requestOtp, verifyOtp, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await requestOtp(email);
      setOtpSent(true);
    } catch (err: any) {
      onError?.(err.message);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verifyOtp(email, code);
      onSuccess?.();
    } catch (err: any) {
      onError?.(err.message);
    }
  };

  if (!otpSent) {
    return (
      <form onSubmit={handleRequestOtp} className={className} style={style}>
        <div>
          <label htmlFor="sp-otp-email">Email</label>
          <input
            id="sp-otp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
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
          {isLoading ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} className={className} style={style}>
      <div>
        <label htmlFor="sp-otp-code">Enter OTP</label>
        <input
          id="sp-otp-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit OTP"
          maxLength={6}
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
        {isLoading ? "Verifying..." : "Verify OTP"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOtpSent(false);
          setCode("");
        }}
        disabled={isLoading}
      >
        Back
      </button>
    </form>
  );
};
