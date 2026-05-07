import { useCallback, useEffect, useState } from "react";
import type { Workspace } from "../types/core";
import { getActiveWorkspace, pickWorkspace } from "../lib/workspaceClient";

type WorkspaceState = {
  active: Workspace | null;
  loading: boolean;
  error: string | null;
};

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>({
    active: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const workspace = await getActiveWorkspace();
      setState({ active: workspace, loading: false, error: null });
    } catch (e: unknown) {
      setState({
        active: null,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  const pick = useCallback(async () => {
    try {
      const workspace = await pickWorkspace();
      if (workspace) {
        setState({ active: workspace, loading: false, error: null });
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    activeWorkspace: state.active,
    loading: state.loading,
    error: state.error,
    refresh,
    pick,
  };
}
