import type { ComponentType } from "react";
import DashboardPage from "../pages/Dashboard";
import HistoryPage from "../pages/History";
import RunViewPage from "../pages/RunView";
import WorkspaceOnboardingPage from "../pages/WorkspaceOnboarding";

export type AppRoute = {
  path: string;
  label: string;
  component: ComponentType;
  nav: "workspace" | "hidden";
};

export const routes: AppRoute[] = [
  { path: "/", label: "Dashboard", component: DashboardPage, nav: "workspace" },
  { path: "/runs", label: "Runs", component: RunViewPage, nav: "workspace" },
  { path: "/history", label: "History", component: HistoryPage, nav: "workspace" },
  { path: "/onboarding", label: "Workspace", component: WorkspaceOnboardingPage, nav: "hidden" },
];
