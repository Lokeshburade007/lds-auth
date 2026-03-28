import { useState, type FormEvent } from "react";
import { useAuth } from "@securepool/react-sdk";

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { changePassword, isLoading, error } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    if (oldPassword === newPassword) {
      setLocalError("New password must be different from old password");
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch {
      // error in context
    }
  };

  const displayError = localError || error;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 200,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: 32,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <h2 style={{ fontSize: 20, color: "#f1f5f9", marginBottom: 4 }}>Change Password</h2>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
          Enter your current password and choose a new one
        </p>

        {success && <div className="success-msg">Password changed!</div>}
        {displayError && <div className="error-msg">{displayError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cp-old">Current Password</label>
            <input
              id="cp-old"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              required
              disabled={isLoading || success}
            />
          </div>
          <div className="form-group">
            <label htmlFor="cp-new">New Password</label>
            <input
              id="cp-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              disabled={isLoading || success}
            />
          </div>
          <div className="form-group">
            <label htmlFor="cp-confirm">Confirm New Password</label>
            <input
              id="cp-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              disabled={isLoading || success}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading || success}>
              {isLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
