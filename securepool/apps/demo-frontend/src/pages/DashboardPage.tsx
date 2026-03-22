import { useEffect, useMemo } from "react";
import { useAuth } from "@securepool/react-sdk";
import { useNavigate } from "react-router-dom";
import AccountSwitcher from "../components/AccountSwitcher";

export default function DashboardPage() {
  const {
    user,
    isAuthenticated,
    isInitialized,
    logout,
    sessions,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
    isLoading,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchSessions();
  }, [isAuthenticated, isInitialized, navigate, fetchSessions]);

  const currentSessionId = useMemo(() => {
    if (sessions.length === 0) return null;
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0].id;
  }, [sessions]);

  const handleRevokeSession = async (sessionId: string) => {
    await revokeSession(sessionId);
    if (sessionId === currentSessionId) {
      logout();
      navigate("/login");
    }
  };

  const handleRevokeAll = async () => {
    await revokeAllSessions();
    logout();
    navigate("/login");
  };

  if (!isAuthenticated) return null;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>SecurePool Dashboard</h1>
        <AccountSwitcher />
      </div>

      <div className="user-info">
        <h2>User Profile</h2>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Email:</strong> {user?.email || "N/A"}</p>
        <p><strong>Verified:</strong> {user?.isVerified ? "Yes" : "No"}</p>
      </div>

      <div className="sessions-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2>Active Sessions</h2>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => fetchSessions()}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        {sessions.length === 0 && (
          <p style={{ color: "#64748b", fontSize: 14 }}>No active sessions found</p>
        )}

        {sessions.map((session) => {
          const isCurrent = session.id === currentSessionId;
          return (
            <div
              key={session.id}
              className="session-item"
              style={{
                borderLeft: isCurrent ? "3px solid #22c55e" : "3px solid transparent",
                paddingLeft: 12,
                background: isCurrent ? "rgba(34, 197, 94, 0.08)" : "transparent",
                borderRadius: isCurrent ? 8 : 0,
              }}
            >
              <div>
                <div className="session-device" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {session.device}
                  {isCurrent && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#22c55e",
                      background: "rgba(34, 197, 94, 0.15)",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}>
                      Current
                    </span>
                  )}
                </div>
                <div className="session-meta">
                  IP: {session.ip} &middot; {new Date(session.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                className={isCurrent ? "btn btn-outline btn-sm" : "btn btn-danger btn-sm"}
                onClick={() => handleRevokeSession(session.id)}
                disabled={isLoading}
                style={isCurrent ? { borderColor: "#ef4444", color: "#ef4444" } : {}}
              >
                {isCurrent ? "Logout this device" : "Revoke"}
              </button>
            </div>
          );
        })}

        {sessions.length > 1 && (
          <button
            className="btn btn-danger"
            style={{ marginTop: 16 }}
            onClick={handleRevokeAll}
            disabled={isLoading}
          >
            Revoke All Sessions
          </button>
        )}
      </div>
    </div>
  );
}
