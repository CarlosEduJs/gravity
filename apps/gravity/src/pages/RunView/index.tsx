import { useMemo } from "react";
import { useGravityEvents } from "../../features/logs/useGravityEvents";
import LogViewer from "../../features/logs/LogViewer";
import { gravity } from "../../lib/gravityClient";
import { useWorkspace } from "../../hooks/useWorkspace";

import { Button } from "@gravity/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gravity/ui/components/card";
import { Separator } from "@gravity/ui/components/separator";

export default function RunViewPage() {
  const { activeWorkspace } = useWorkspace();
  const workspacePath = activeWorkspace?.path ?? "";
  const { logs, endRef, isRunning, currentRunId, runs } = useGravityEvents(workspacePath);

  const currentRun = runs.find((run) => run.runId === currentRunId) ?? runs[0];

  const formatDuration = (durationMs: number | null) => {
    if (!durationMs) return "-";
    const seconds = Math.round(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}m ${remainder}s`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "-";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const statusLabel = useMemo(() => {
    if (isRunning) return "Running";
    if (logs.length > 0) return "Finished";
    return "Idle";
  }, [isRunning, logs.length]);

  const stopJob = async () => {
    if (!currentRunId) return;
    await gravity.stopJob(currentRunId);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Run</p>
          <h1 className="text-lg font-semibold text-foreground">Execution</h1>
          <p className="text-xs text-muted-foreground">Status: {statusLabel}</p>
        </div>
        {isRunning && (
          <Button variant="destructive" onClick={stopJob}>
            Stop run
          </Button>
        )}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Run summary</CardTitle>
          <CardDescription>Execution details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Run ID</span>
              <span className="text-foreground">{currentRun?.runId ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="text-foreground">{currentRun?.status ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Started</span>
              <span className="text-foreground">{formatTime(currentRun?.startedAt ?? null)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Finished</span>
              <span className="text-foreground">{formatTime(currentRun?.finishedAt ?? null)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Duration</span>
              <span className="text-foreground">{formatDuration(currentRun?.durationMs ?? null)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live logs</CardTitle>
          <CardDescription>Run output and step progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator />
          <div className="max-h-[60vh] overflow-auto pt-4">
            <LogViewer logs={logs} endRef={endRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
