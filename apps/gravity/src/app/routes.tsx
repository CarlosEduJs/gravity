import type { ComponentType } from "react";
import DashboardPage from "../pages/Dashboard";
import HistoryPage from "../pages/History";
import SettingsPage from "../pages/Settings";
import RunViewPage from "../pages/RunView";
import WorkspaceOnboardingPage from "../pages/WorkspaceOnboarding";

export type AppRoute = {
	path: string;
	label: string;
	component: ComponentType;
	nav: "workspace" | "app" | "hidden";
};

export const routes: AppRoute[] = [
	{ path: "/", label: "Dashboard", component: DashboardPage, nav: "workspace" },
	{ path: "/runs", label: "Runs", component: RunViewPage, nav: "workspace" },
	{ path: "/history", label: "History", component: HistoryPage, nav: "workspace" },
	{ path: "/settings", label: "Settings", component: SettingsPage, nav: "app" },
	{ path: "/onboarding", label: "Workspace", component: WorkspaceOnboardingPage, nav: "hidden" },
];
