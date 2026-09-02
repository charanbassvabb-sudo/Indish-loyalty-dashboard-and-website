import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { PageLoader } from "@/components/ui/PageLoader";

// Every page is its own chunk, fetched on demand — otherwise the whole admin
// dashboard (tables, drawers, the payment-screenshot review UI) shipped in
// the same bundle as the public menu, so a guest just checking hours on
// mobile data paid for code they'd never run. See PageLoader for the
// (rarely-seen, chunk-download-only) fallback.
const BranchSelectPage = lazy(() => import("@/pages/BranchSelectPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const MenuPage = lazy(() => import("@/pages/MenuPage"));
const MenuLandingPage = lazy(() => import("@/pages/MenuLandingPage"));
const ReservePage = lazy(() => import("@/pages/ReservePage"));
const TakeawayPage = lazy(() => import("@/pages/TakeawayPage"));
const CateringPage = lazy(() => import("@/pages/CateringPage"));
const LeaveReviewPage = lazy(() => import("@/pages/LeaveReviewPage"));
const ComplaintsPage = lazy(() => import("@/pages/ComplaintsPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminStatusPage = lazy(() => import("@/pages/admin/AdminStatusPage"));

function PublicSite() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<BranchSelectPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          {/* Branch-agnostic landing pages — what the two front-of-house QR
              codes point at, so one printed code works regardless of which
              branch it's scanned at. Must come before the /:branchId
              catch-all below or "menu"/"leave-a-review" would be parsed as
              a branch id instead. */}
          <Route path="/menu" element={<MenuLandingPage />} />
          <Route path="/leave-a-review" element={<LeaveReviewPage />} />
          <Route path="/:branchId" element={<HomePage />} />
          <Route path="/:branchId/menu" element={<MenuPage />} />
          <Route path="/:branchId/reserve" element={<ReservePage />} />
          <Route path="/:branchId/takeaway" element={<TakeawayPage />} />
          <Route path="/:branchId/catering" element={<CateringPage />} />
          <Route path="/:branchId/complaints" element={<ComplaintsPage />} />
          <Route path="/:branchId/*" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function AdminArea() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="login" element={<AdminLoginPage />} />
          <Route
            index
            element={
              <ProtectedAdminRoute>
                <AdminDashboardPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="status"
            element={
              <ProtectedAdminRoute>
                <AdminStatusPage />
              </ProtectedAdminRoute>
            }
          />
        </Routes>
      </Suspense>
    </AdminAuthProvider>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminArea />} />
      <Route path="/*" element={<PublicSite />} />
    </Routes>
  );
}

export default App;
