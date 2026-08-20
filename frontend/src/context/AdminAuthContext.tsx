import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiRequestError } from "@/lib/api";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

interface AdminAuthValue {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ admin: AdminUser }>("/admin/auth/me")
      .then((res) => setAdmin(res.admin))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ admin: AdminUser }>("/admin/auth/login", { email, password });
    setAdmin(res.admin);
  }

  async function logout() {
    await api.post("/admin/auth/logout");
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export { ApiRequestError };
