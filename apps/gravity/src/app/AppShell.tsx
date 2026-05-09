import { useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home03Icon, Activity03Icon, Clock04Icon, Setting07Icon } from "@hugeicons/core-free-icons";

import { routes } from "./routes";
import { useWorkspace } from "../hooks/useWorkspace";
import WorkspaceSwitcher from "../features/workspace/WorkspaceSwitcher";

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
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@gravity/ui/components/sidebar";

const navIcons = {
  "/": Home03Icon,
  "/runs": Activity03Icon,
  "/history": Clock04Icon,
} as const;

export default function AppShell() {
  const { activeWorkspace, pick, workspaces, setActive } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  const workspaceRoutes = useMemo(() => routes.filter((route) => route.nav === "workspace"), []);

  const workspaceName = activeWorkspace?.name ?? "";
  const workspacePath = activeWorkspace?.path ?? "";

  const handlePick = async () => {
    const workspace = await pick();
    if (!workspace) return;
    if (location.pathname === "/onboarding") {
      navigate("/");
    }
  };

  const currentPath = location.pathname === "/" ? "/" : location.pathname;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset" className="bg-background">
        <SidebarHeader className="flex-row items-center justify-between gap-4">
          <WorkspaceSwitcher
            name={workspaceName}
            path={workspacePath}
            onPick={handlePick}
            onSelect={setActive}
            workspaces={workspaces}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceRoutes.map((route) => {
                  const Icon = navIcons[route.path as keyof typeof navIcons];
                  return (
                    <SidebarMenuItem key={route.path}>
                      <SidebarMenuButton
                        render={(props) => (
                          <NavLink
                            to={route.path === "/" ? "." : route.path}
                            data-active={currentPath === route.path || undefined}
                            {...props}
                          >
                            {Icon && <HugeiconsIcon icon={Icon} data-icon="inline-start" />}
                            <span className="font-medium">{route.label}</span>
                          </NavLink>
                        )}
                        isActive={currentPath === route.path}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarFooterContent currentPath={currentPath} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-card rounded-2xl">
        <div className="flex min-h-svh flex-1 flex-col py-5">
          <div className="flex-1 px-6 pb-8">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface SidebarFooterProps {
  currentPath?: string;
}

function SidebarFooterContent({ currentPath }: SidebarFooterProps) {
  const { open } = useSidebar();

  return (
    <div className="flex items-center">
      {open && (
        <NavLink
          to={"/settings"}
          data-active={currentPath === "/settings" ? "true" : undefined}
          className="flex items-center gap-2 rounded-lg px-1.5 py-0.5 hover:bg-accent-foreground w-fit"
        >
          <HugeiconsIcon icon={Setting07Icon} className="size-3.5" data-icon="inline-start" />
        </NavLink>
      )}
      <SidebarTrigger />
    </div>
  );
}
