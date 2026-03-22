import { useState, useRef, useEffect } from "react";
import { useAuth } from "@securepool/react-sdk";
import { useNavigate } from "react-router-dom";
import ChangePasswordModal from "./ChangePasswordModal";

function getGravatarUrl(email: string, size = 80): string {
  // Simple hash for gravatar - use md5 in production
  // For now, use UI Avatars as a fallback that always works
  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=3b82f6&color=fff&bold=true&format=svg`;
}

export default function AccountSwitcher() {
  const { user, accounts, switchAccount, logoutAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const otherAccounts = accounts.filter((a) => a.id !== user?.id);

  const handleSwitch = (accountId: string) => {
    switchAccount(accountId);
    setOpen(false);
    navigate("/dashboard");
    window.location.reload(); // Reload to re-fetch sessions for new account
  };

  const handleLogoutOther = (accountId: string) => {
    logoutAccount(accountId);
  };

  const handleAddAccount = () => {
    setOpen(false);
    // Don't logout current - just go to login to add another
    navigate("/login");
  };

  const handleLogoutCurrent = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid #334155",
          padding: 0,
          cursor: "pointer",
          overflow: "hidden",
          background: "#3b82f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#334155")}
      >
        <img
          src={getGravatarUrl(user?.email || "", 80)}
          alt="avatar"
          style={{ width: 36, height: 36, borderRadius: "50%" }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 0,
            width: 320,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Current User */}
          <div
            style={{
              padding: "16px 16px 12px",
              borderBottom: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={getGravatarUrl(user?.email || "", 80)}
                alt="avatar"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "2px solid #22c55e",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#f1f5f9",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.email}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#22c55e",
                    fontWeight: 500,
                    marginTop: 2,
                  }}
                >
                  Active
                </div>
              </div>
            </div>
          </div>

          {/* Other Accounts */}
          {otherAccounts.length > 0 && (
            <div style={{ borderBottom: "1px solid #334155" }}>
              <div
                style={{
                  padding: "8px 16px 4px",
                  fontSize: 11,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Other accounts
              </div>
              {otherAccounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(59,130,246,0.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() => handleSwitch(account.id)}
                >
                  <img
                    src={getGravatarUrl(account.email, 80)}
                    alt="avatar"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid #334155",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#e2e8f0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {account.email}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Click to switch
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogoutOther(account.id);
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid #475569",
                      color: "#94a3b8",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#ef4444";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#475569";
                      e.currentTarget.style.color = "#94a3b8";
                    }}
                  >
                    Logout
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: 8 }}>
            <button
              onClick={() => { setShowChangePassword(true); setOpen(false); }}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 8,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(148,163,184,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                🔒
              </span>
              Change password
            </button>
            <button
              onClick={handleAddAccount}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                color: "#60a5fa",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 8,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(59,130,246,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "2px dashed #475569",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#64748b",
                }}
              >
                +
              </span>
              Add another account
            </button>
            <button
              onClick={handleLogoutCurrent}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                color: "#ef4444",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 8,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(239,68,68,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(239,68,68,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ↪
              </span>
              Sign out
            </button>
          </div>
        </div>
      )}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
