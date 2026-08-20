import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BranchSwitcher } from "@/components/branch-switcher";
import { Toaster } from "@/components/ui/sonner";
import { AuroraBackground } from "@/components/aurora-background";
import { getCurrentStaffFn, getSelectedBranchFn } from "@/lib/functions";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const staff = await getCurrentStaffFn();
    if (!staff) {
      throw redirect({ to: "/login" });
    }
    // Every branch-scoped loader/mutation in child routes reads this from
    // context — see e.g. dashboard.tsx's `loader: ({ context }) => ...`.
    const branch = await getSelectedBranchFn();
    return { staff, branch };
  },
  component: AppLayout,
});

function AppLayout() {
  const { staff, branch } = Route.useRouteContext();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full bg-background">
        <AuroraBackground />
        <div className="relative z-10 contents">
          <AppSidebar staff={staff} />
        </div>
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <BranchSwitcher branch={branch} />
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-success" />
              </span>
              Loyalty campaign active
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
