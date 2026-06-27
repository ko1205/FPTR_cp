import { createContext, useContext, useState } from "react";

export interface AuthUser {
  name: string;
  email: string;
  color: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const KEY = "fptr.auth";

function load(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

/** 프로토타입용 더미 인증 — 비밀번호 검증 없음, localStorage 유지 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => load());

  const login = (email: string) => {
    const namePart = email.split("@")[0] || "User";
    const name = namePart
      .split(/[._-]+/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    const u: AuthUser = { name, email, color: "#674ea7" };
    setUser(u);
    localStorage.setItem(KEY, JSON.stringify(u));
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem(KEY);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
