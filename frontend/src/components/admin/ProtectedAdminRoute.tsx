import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";

export function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Carries the page someone actually tried to reach (e.g. a bookmarked
  // /admin/status) through the login redirect — AdminLoginPage reads this
  // back out to send them there instead of always landing on /admin.
  if (!admin) return <Navigate to="/admin/login" state={{ from: location }} replace />;

  return <>{children}</>;
}
