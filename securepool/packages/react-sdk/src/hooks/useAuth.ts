import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { AuthContextValue } from "../types";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a SecurePoolProvider");
  }
  return context;
}
