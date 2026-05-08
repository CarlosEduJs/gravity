import { BrowserRouter } from "react-router-dom";
import AppRouter from "../app/AppRouter";
import { WorkspaceProvider } from "../hooks/useWorkspace";

export default function App() {
	return (
		<WorkspaceProvider>
			<BrowserRouter>
				<AppRouter />
			</BrowserRouter>
		</WorkspaceProvider>
	);
}
