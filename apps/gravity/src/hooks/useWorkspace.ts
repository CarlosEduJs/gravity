import type { ReactNode } from "react";
import {
	createContext,
	createElement,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { Workspace } from "../types/core";
import { gravity } from "../lib/gravityClient";

type WorkspaceState = {
	active: Workspace | null;
	loading: boolean;
	error: string | null;
	list: Workspace[];
};

type WorkspaceContextValue = {
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  workspaces: Workspace[];
  refresh: () => Promise<void>;
  pick: () => Promise<Workspace | null>;
  setActive: (path: string) => Promise<Workspace | null>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<WorkspaceState>({
		active: null,
		loading: true,
		error: null,
		list: [],
	});

	const refresh = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true, error: null }));
		try {
			const [workspace, list] = await Promise.all([
				gravity.getWorkspace(),
				gravity.listWorkspaces(),
			]);
			setState({ active: workspace, list, loading: false, error: null });
		} catch (e: unknown) {
			setState({
				active: null,
				list: [],
				loading: false,
				error: e instanceof Error ? e.message : String(e),
			});
		}
	}, []);

	const pick = useCallback(async () => {
		try {
			const workspace = await gravity.pickWorkspace();
			if (workspace) {
				const list = await gravity.listWorkspaces();
				setState({ active: workspace, list, loading: false, error: null });
			}
			return workspace;
		} catch (e: unknown) {
			setState((prev) => ({
				...prev,
				loading: false,
				error: e instanceof Error ? e.message : String(e),
			}));
			return null;
		}
	}, []);

	const setActive = useCallback(async (path: string) => {
		try {
			const workspace = await gravity.setWorkspace(path);
			const list = await gravity.listWorkspaces();
			setState({ active: workspace, list, loading: false, error: null });
			return workspace;
		} catch (e: unknown) {
			setState((prev) => ({
				...prev,
				loading: false,
				error: e instanceof Error ? e.message : String(e),
			}));
			return null;
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const value = useMemo<WorkspaceContextValue>(
		() => ({
			activeWorkspace: state.active,
			loading: state.loading,
			error: state.error,
			workspaces: state.list,
			refresh,
			pick,
			setActive,
		}),
		[state, refresh, pick, setActive]
	);

	return createElement(WorkspaceContext.Provider, { value }, children);
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
