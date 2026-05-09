import type { ReactNode } from "react";
import {
	createContext,
	createElement,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { GravityEvent, RunSummary } from "../../types/core";
import { gravity } from "../../lib/gravityClient";
import { useWorkspace } from "../../hooks/useWorkspace";

export type LogLine = {
	id: string;
	text: string;
	type: string;
};

const MAX_LOG_LINES = 5_000;
const PERSIST_DEBOUNCE_MS = 500;

const statusMap: Record<string, string> = {
	success: "RUN SUCCESSFUL",
	canceled: "RUN CANCELED",
	error: "RUN FAILED",
};

type GravityEventsContextValue = {
	logs: LogLine[];
	isRunning: boolean;
	currentRunId: string | null;
	runs: RunSummary[];
	clearLogs: () => void;
	enrichRun: (runId: string, meta: Partial<RunSummary>) => void;
};

const GravityEventsContext = createContext<GravityEventsContextValue | null>(null);

function getTimestamp(event: GravityEvent): Date {
	const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
	return Number.isNaN(timestamp.getTime()) ? new Date() : timestamp;
}

function appendLog(prev: LogLine[], entry: LogLine): LogLine[] {
	const next = [...prev, entry];
	return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
}

export function GravityEventsProvider({ children }: { children: ReactNode }) {
	const { activeWorkspace } = useWorkspace();
	const workspaceKey = activeWorkspace?.path ?? "";

	const [logs, setLogs] = useState<LogLine[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [currentRunId, setCurrentRunId] = useState<string | null>(null);
	const [runs, setRuns] = useState<RunSummary[]>([]);

	const persistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const latestRunsRef = useRef<RunSummary[]>([]);

	const schedulePersist = useCallback(() => {
		if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
		persistTimerRef.current = setTimeout(async () => {
			try {
				const state = await gravity.getWorkspaceState();
				await gravity.updateWorkspaceState({ ...state, runs: latestRunsRef.current });
			} catch {
				// persistence is best-effort
			}
		}, PERSIST_DEBOUNCE_MS);
	}, []);

	// Cleanup persist timer on unmount
	useEffect(() => {
		return () => {
			if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
		};
	}, []);

	// Load persisted runs when workspace changes
	useEffect(() => {
		if (!workspaceKey) {
			setRuns([]);
			setLogs([]);
			setIsRunning(false);
			setCurrentRunId(null);
			return;
		}
		gravity
			.getWorkspaceState()
			.then((state) => {
				const loaded = Array.isArray(state.runs) ? state.runs : [];
				setRuns(loaded);
				latestRunsRef.current = loaded;
			})
			.catch(() => {
				setRuns([]);
				latestRunsRef.current = [];
			});
	}, [workspaceKey]);

	// SSE subscription
	useEffect(() => {
		if (!workspaceKey) return;

		const unsubscribe = gravity.subscribe((data: GravityEvent) => {
			if (data.type === "log.output") {
				setLogs((prev) =>
					appendLog(prev, { id: data.id, text: `      ${data.payload.message}`, type: "log.output" }),
				);
				return;
			}
			if (data.type === "job.started") {
				setLogs((prev) =>
					appendLog(prev, { id: data.id, text: `▶ JOB: ${data.payload.name}`, type: "job.started" }),
				);
				return;
			}
			if (data.type === "job.finished") {
				setLogs((prev) =>
					appendLog(prev, {
						id: data.id,
						text: `■ JOB FINISHED (Status: ${data.payload.status})`,
						type: "job.finished",
					}),
				);
				return;
			}
			if (data.type === "step.started") {
				setLogs((prev) =>
					appendLog(prev, { id: data.id, text: `   ▶ STEP: ${data.payload.name}`, type: "step.started" }),
				);
				return;
			}
			if (data.type === "step.finished") {
				setLogs((prev) =>
					appendLog(prev, {
						id: data.id,
						text: `   ■ STEP FINISHED (Status: ${data.payload.status})`,
						type: "step.finished",
					}),
				);
				return;
			}
			if (data.type === "run.started") {
				setCurrentRunId(data.runId);
				setIsRunning(true);
				const startedAt = getTimestamp(data).toISOString();
				setRuns((prev) => {
					const match = prev.find((item) => item.runId === data.runId);
					const next = prev.filter((item) => item.runId !== data.runId);
					const updated = [
						{
							runId: data.runId,
							status: "running" as const,
							startedAt,
							finishedAt: null,
							durationMs: null,
							event: data.payload.event ?? match?.event,
							jobId: match?.jobId,
							workflowName: match?.workflowName,
							workflowFile: match?.workflowFile,
						},
						...next,
					].slice(0, 20);
					latestRunsRef.current = updated;
					return updated;
				});
				// Persist OUTSIDE updater — avoids double-fire in StrictMode
				schedulePersist();
				setLogs((prev) =>
					appendLog(prev, {
						id: data.id,
						text: `RUN STARTED (Job: ${data.payload.event || "all"})`,
						type: "system",
					}),
				);
				return;
			}
			if (data.type === "run.finished") {
				const statusText = statusMap[data.payload.status] ?? `RUN FINISHED (${data.payload.status})`;
				const finishedAt = getTimestamp(data).toISOString();
				setRuns((prev) => {
					const match = prev.find((item) => item.runId === data.runId);
					const startedAt = match?.startedAt ?? finishedAt;
					const durationMs = Math.max(
						0,
						new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
					);
					const updated: RunSummary = {
						runId: data.runId,
						status: data.payload.status,
						startedAt,
						finishedAt,
						durationMs,
						event: match?.event,
						jobId: match?.jobId,
						workflowName: match?.workflowName,
						workflowFile: match?.workflowFile,
					};
					const next = [updated, ...prev.filter((item) => item.runId !== data.runId)].slice(0, 20);
					latestRunsRef.current = next;
					return next;
				});
				schedulePersist();
				setLogs((prev) => appendLog(prev, { id: data.id, text: statusText, type: "system" }));
				setIsRunning(false);
				setCurrentRunId(null);
			}
		});

		return () => unsubscribe();
	}, [workspaceKey, schedulePersist]);

	const clearLogs = useCallback(() => setLogs([]), []);

	const enrichRun = useCallback(
		(runId: string, meta: Partial<RunSummary>) => {
			setRuns((prev) => {
				const updated = prev.map((run) => (run.runId === runId ? { ...run, ...meta } : run));
				latestRunsRef.current = updated;
				return updated;
			});
			schedulePersist();
		},
		[schedulePersist],
	);

	const value = useMemo<GravityEventsContextValue>(
		() => ({ logs, isRunning, currentRunId, runs, clearLogs, enrichRun }),
		[logs, isRunning, currentRunId, runs, clearLogs, enrichRun],
	);

	return createElement(GravityEventsContext.Provider, { value }, children);
}

export function useGravityEvents(): GravityEventsContextValue {
	const ctx = useContext(GravityEventsContext);
	if (!ctx) {
		throw new Error("useGravityEvents must be used within GravityEventsProvider");
	}
	return ctx;
}
