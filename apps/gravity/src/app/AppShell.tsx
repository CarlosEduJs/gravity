import { useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Home03Icon,
	Activity03Icon,
	Clock04Icon,
} from "@hugeicons/core-free-icons";

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
} from "@gravity/ui/components/sidebar";
import { ThemeProvider } from "../components/theme-provider";

const navIcons = {
	"/": Home03Icon,
	"/runs": Activity03Icon,
	"/history": Clock04Icon,
} as const;

export default function AppShell() {
	const { activeWorkspace, pick } = useWorkspace();
	const location = useLocation();
	const navigate = useNavigate();

	const workspaceRoutes = useMemo(
		() => routes.filter((route) => route.nav === "workspace"),
		[]
	);
	const appRoutes = useMemo(
		() => routes.filter((route) => route.nav === "app"),
		[]
	);

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
		<ThemeProvider defaultTheme="dark">
		<SidebarProvider>
			<Sidebar collapsible="icon" variant="inset" className="bg-background">
				<SidebarHeader>
					<WorkspaceSwitcher
						name={workspaceName}
						path={workspacePath}
						onPick={handlePick}
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
														{Icon && (
															<HugeiconsIcon icon={Icon} data-icon="inline-start" />
														)}
														{route.label}
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
					{appRoutes.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>App</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{appRoutes.map((route) => (
										<SidebarMenuItem key={route.path}>
											<SidebarMenuButton
												render={(props) => (
													<NavLink
														to={route.path}
														data-active={currentPath === route.path || undefined}
														{...props}
													>
														{route.label}
													</NavLink>
												)}
												isActive={currentPath === route.path}
											/>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}
				</SidebarContent>
				<SidebarFooter />
			</Sidebar>
			<SidebarInset className="bg-card rounded-2xl">
				<div className="flex min-h-svh flex-1 flex-col py-5">
					<div className="flex-1 px-6 pb-8">
						<Outlet />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
		</ThemeProvider>
	);
}
