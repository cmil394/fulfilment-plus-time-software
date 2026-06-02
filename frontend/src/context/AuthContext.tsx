import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../services/auth.service";
import { authService } from "../services/auth.service";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      const parsed = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsed);
      authService.getProfile().then((res) => {
        const fresh = res.data.user;
        setUser(fresh);
        localStorage.setItem("user", JSON.stringify(fresh));
      }).catch(() => { }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const setAuth = (newUser: User, newToken: string) => {
    if (!newUser || !newToken) return;
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    console.log(
      `[Auth] Logged in — ${newUser.firstName} ${newUser.lastName} (${newUser.role})`,
    );
  };

  const logout = () => {
    const name = user ? `${user.firstName} ${user.lastName}` : "Unknown";
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    console.log(`[Auth] Logged out — ${name}`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        setAuth,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
