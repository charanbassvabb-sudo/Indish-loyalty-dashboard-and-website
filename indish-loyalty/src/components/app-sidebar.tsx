import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Search,
  Gift,
  Settings as SettingsIcon,
  ShieldCheck,
  BarChart3,
  LogOut,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { IndishWordmark } from "@/components/indish-logo";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { logoutFn } from "@/lib/functions";
import { RESTAURANT_ADMIN_URL } from "@/lib/restaurant";
import type { Staff } from "@/lib/types";

const workflow = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Register Customer", url: "/register", icon: UserPlus },
  { title: "Quick Search", url: "/search", icon: Search },
  { title: "Rewards", url: "/rewards", icon: Gift },
];

const admin = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Staff", url: "/staff", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export function AppSidebar({ staff }: { staff: Staff }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const router = useRouter();
  const isActive = (url: string) => path === url || path.startsWith(url + "/");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    await logoutFn();
    router.navigate({ to: "/login" });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <IndishWordmark />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflow.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="relative transition-colors duration-300 data-[active=true]:text-gold"
                  >
                    <Link to={item.url} className="relative flex items-center gap-3">
                      {isActive(item.url) && (
                        <motion.span
                          layoutId="sidebar-active-bar"
                          className="absolute -left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold"
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        />
                      )}
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {staff.role === "manager" && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {admin.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="relative transition-colors duration-300 data-[active=true]:text-gold"
                    >
                      <Link to={item.url} className="relative flex items-center gap-3">
                        {isActive(item.url) && (
                          <motion.span
                            layoutId="sidebar-active-bar"
                            className="absolute -left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold"
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          />
                        )}
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="rounded-md bg-sidebar-accent/50 p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Signed in</div>
          <div className="mt-1 truncate text-sm font-medium">{staff.fullName}</div>
          <div className="text-xs text-gold capitalize">{staff.role}</div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href={RESTAURANT_ADMIN_URL + "/admin"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Reservations Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setChangePasswordOpen(true)} className="text-muted-foreground">
              <KeyRound className="h-4 w-4" />
              <span>Change password</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="/login"
                onClick={handleLogout}
                className="flex items-center gap-3 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </Sidebar>
  );
}
