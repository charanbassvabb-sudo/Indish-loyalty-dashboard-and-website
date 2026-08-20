import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";

export function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!admin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}
