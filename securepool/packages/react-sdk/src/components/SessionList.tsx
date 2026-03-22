import React, { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

interface SessionListProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SessionList: React.FC<SessionListProps> = ({
  className,
  style,
}) => {
  const {
    sessions,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
    isLoading,
  } = useAuth();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className={className} style={style}>
      <h3>Active Sessions</h3>
      {sessions.length === 0 && <p>No active sessions</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {sessions.map((session) => (
          <li
            key={session.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <div>
              <strong>{session.device}</strong>
              <br />
              <small>
                IP: {session.ip} | {new Date(session.createdAt).toLocaleString()}
              </small>
            </div>
            <button
              onClick={() => revokeSession(session.id)}
              disabled={isLoading}
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
      {sessions.length > 0 && (
        <button onClick={revokeAllSessions} disabled={isLoading}>
          Revoke All Sessions
        </button>
      )}
    </div>
  );
};
