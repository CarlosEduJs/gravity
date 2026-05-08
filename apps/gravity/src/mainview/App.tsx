import { BrowserRouter } from "react-router-dom";
import AppRouter from "../app/AppRouter";
import { WorkspaceProvider } from "../hooks/useWorkspace";
import { ThemeProvider } from "../components/theme-provider";

export default function App() {
	return (
		<ThemeProvider defaultTheme="system">
			<WorkspaceProvider>
				<BrowserRouter>
					<AppRouter />
				</BrowserRouter>
			</WorkspaceProvider>
		</ThemeProvider>
	);
}
