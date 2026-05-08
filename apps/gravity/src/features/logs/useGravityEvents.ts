import { useEffect, useRef, useState } from "react";
import type { GravityEvent, RunSummary, WorkspaceState } from "../../types/core";
import { gravity } from "../../lib/gravityClient";

export type LogLine = {
  id: string;
  text: string;
  type: string;
};

const statusMap: Record<string, string> = {
  success: "RUN SUCCESSFUL",
  canceled: "RUN CANCELED",
  error: "RUN FAILED",
};

export function useGravityEvents(workspaceKey?: string) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const getTimestamp = (event: GravityEvent) => {
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
    return Number.isNaN(timestamp.getTime()) ? new Date() : timestamp;
  };

  useEffect(() => {
    gravity
      .getWorkspaceState()
      .then((state) => {
        if (Array.isArray(state.runs)) {
          setRuns(state.runs);
        } else {
          setRuns([]);
        }
      })
      .catch(() => {
        setRuns([]);
      });
  }, [workspaceKey]);

  const persistRuns = (nextRuns: RunSummary[]) => {
    gravity
      .getWorkspaceState()
      .then((state) => gravity.updateWorkspaceState({ ...state, runs: nextRuns }))
      .catch(() => {});
  };

  useEffect(() => {
    const unsubscribe = gravity.subscribe((data: GravityEvent) => {
      if (data.type === "log.output") {
        setLogs((prev) => [
          ...prev,
          { id: data.id, text: `      ${data.payload.message}`, type: "log.output" },
        ]);
        return;
      }
      if (data.type === "job.started") {
        setLogs((prev) => [
          ...prev,
          { id: data.id, text: `▶ JOB: ${data.payload.name}`, type: "job.started" },
        ]);
        return;
      }
      if (data.type === "job.finished") {
        setLogs((prev) => [
          ...prev,
          {
            id: data.id,
            text: `■ JOB FINISHED (Status: ${data.payload.status})`,
            type: "job.finished",
          },
        ]);
        return;
      }
      if (data.type === "step.started") {
        setLogs((prev) => [
          ...prev,
          { id: data.id, text: `   ▶ STEP: ${data.payload.name}`, type: "step.started" },
        ]);
        return;
      }
      if (data.type === "step.finished") {
        setLogs((prev) => [
          ...prev,
          {
            id: data.id,
            text: `   ■ STEP FINISHED (Status: ${data.payload.status})`,
            type: "step.finished",
          },
        ]);
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
              status: "running",
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
          persistRuns(updated);
          return updated;
        });
        setLogs((prev) => [
          ...prev,
          {
            id: data.id,
            text: `RUN STARTED (Job: ${data.payload.event || "all"})`,
            type: "system",
          },
        ]);
        return;
      }
      if (data.type === "run.finished") {
        const statusText =
          statusMap[data.payload.status] ?? `RUN FINISHED (${data.payload.status})`;
        const finishedAt = getTimestamp(data).toISOString();
        setRuns((prev) => {
          const match = prev.find((item) => item.runId === data.runId);
          const startedAt = match?.startedAt ?? finishedAt;
          const durationMs = Math.max(
            0,
            new Date(finishedAt).getTime() - new Date(startedAt).getTime()
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
          const next = [updated, ...prev.filter((item) => item.runId !== data.runId)];
          const sliced = next.slice(0, 20);
          persistRuns(sliced);
          return sliced;
        });
        setLogs((prev) => [...prev, { id: data.id, text: statusText, type: "system" }]);
        setIsRunning(false);
        setCurrentRunId(null);
      }
    });

    return () => unsubscribe();
  }, [workspaceKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const clearLogs = () => setLogs([]);

  return {
    logs,
    isRunning,
    currentRunId,
    runs,
    endRef,
    clearLogs,
  };
}
