import { BrowserRouter } from "react-router-dom";
import AppRouter from "../app/AppRouter";
import { WorkspaceProvider } from "../hooks/useWorkspace";
import { ThemeProvider } from "../components/theme-provider";
import { GravityEventsProvider } from "../features/logs/useGravityEvents";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <WorkspaceProvider>
        <GravityEventsProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </GravityEventsProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
