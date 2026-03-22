import React from "react";
import { useAuth } from "../hooks/useAuth";

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  className,
  style,
  label = "Sign in with Google",
}) => {
  const { loginWithGoogle, isLoading } = useAuth();

  const handleClick = async () => {
    try {
      // In production, integrate with Google Identity Services SDK
      // to obtain the credential token, then pass it here.
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.prompt((response: any) => {
          if (response.credential) {
            loginWithGoogle(response.credential).then(onSuccess).catch((err: any) => {
              onError?.(err.message);
            });
          }
        });
      } else {
        throw new Error(
          "Google Identity Services SDK not loaded. Add the script to your HTML."
        );
      }
    } catch (err: any) {
      onError?.(err.message);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
      style={style}
    >
      {isLoading ? "Signing in..." : label}
    </button>
  );
};
