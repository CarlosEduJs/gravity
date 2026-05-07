import { Route, Routes, Navigate } from "react-router-dom";

import AppShell from "./AppShell";
import { routes } from "./routes";
import { useWorkspace } from "../hooks/useWorkspace";
import WorkspaceOnboardingPage from "../pages/WorkspaceOnboarding";
import DashboardPage from "../pages/Dashboard";

export default function AppRouter() {
  const { activeWorkspace, loading } = useWorkspace();
  const hasWorkspace = Boolean(activeWorkspace?.path);

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={hasWorkspace ? <Navigate to="/" replace /> : <WorkspaceOnboardingPage />}
      />
      <Route path="/" element={hasWorkspace ? <AppShell /> : <Navigate to="/onboarding" replace />}>
        {routes
          .filter((route) => route.nav !== "hidden" && route.path !== "/")
          .map((route) => (
            <Route
              key={route.path}
              path={route.path.replace("/", "")}
              element={<route.component />}
            />
          ))}
        <Route index element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
