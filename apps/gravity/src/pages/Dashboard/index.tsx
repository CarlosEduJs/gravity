import { useEffect, useState } from "react";
import type { Job, Workflow, WorkspaceState } from "../../types/core";
import { gravity } from "../../lib/gravityClient";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useGravityEvents } from "../../features/logs/useGravityEvents";
import LogViewer from "../../features/logs/LogViewer";
import { formatDuration, formatTimestamp } from "../../lib/format";

import { Button } from "@gravity/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gravity/ui/components/card";
import { Separator } from "@gravity/ui/components/separator";

export default function DashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const workspaceName = activeWorkspace?.name ?? "";
  const workspacePath = activeWorkspace?.path ?? "";
  const hasWorkspace = Boolean(activeWorkspace?.path);

  const { logs, clearLogs, isRunning, currentRunId, runs, enrichRun } = useGravityEvents();
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentRun = runs[0];
  const workflowCount = workflows?.length ?? workspaceState?.workflowCount ?? 0;
  const jobCount =
    workflows?.reduce((total, wf) => total + (wf.jobs?.length ?? 0), 0) ??
    workspaceState?.jobCount ??
    0;

  useEffect(() => {
    if (!workspacePath) {
      setWorkflows(null);
      setWorkspaceState(null);
      return;
    }
    gravity
      .getWorkspaceState()
      .then((state) => setWorkspaceState(state))
      .catch(() => {
        setWorkspaceState(null);
      });
  }, [workspacePath]);

  const loadWorkflows = async () => {
    if (!workspacePath) return;
    setLoading(true);
    setError(null);
    try {
      const result = await gravity.plan(workspacePath);
      setWorkflows(result);
      const jobTotal = result.reduce((total, wf) => total + (wf.jobs?.length ?? 0), 0);
      const nextState: WorkspaceState = {
        runs,
        lastWorkflowPlanAt: new Date().toISOString(),
        workflowCount: result.length,
        jobCount: jobTotal,
      };
      gravity
        .updateWorkspaceState(nextState)
        .then(setWorkspaceState)
        .catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const runJob = async (jobId: string, workflow?: Workflow) => {
    if (!workspacePath) return;
    clearLogs();
    setError(null);
    gravity
      .runJob(workspacePath, jobId)
      .then((result) => {
        enrichRun(result.runId, {
          jobId,
          workflowName: workflow?.name,
          workflowFile: workflow?.file,
        });
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      });
  };

  const stopJob = async () => {
    if (!currentRunId) return;
    try {
      await gravity.stopJob(currentRunId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Workspace</p>
          <h1 className="text-lg font-semibold text-foreground">{workspaceName || "Workspace"}</h1>
          <p className="text-xs text-muted-foreground">
            {workspacePath || "No workspace selected"}
          </p>
        </div>
        <Button onClick={loadWorkflows} disabled={!hasWorkspace || loading}>
          {loading ? "Loading..." : "Load workflows"}
        </Button>
      </div>

      {error && (
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Workspace summary</CardTitle>
            <CardDescription>Key workspace stats.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Workflows</span>
                <span className="text-foreground">
                  {workflows || workspaceState ? workflowCount : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Jobs</span>
                <span className="text-foreground">
                  {workflows || workspaceState ? jobCount : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last plan</span>
                <span className="text-foreground">
                  {workspaceState?.lastWorkflowPlanAt
                    ? formatTimestamp(workspaceState.lastWorkflowPlanAt)
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last run</span>
                <span className="text-foreground">
                  {recentRun ? formatTimestamp(recentRun.finishedAt ?? recentRun.startedAt) : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Latest execution</CardTitle>
            <CardDescription>Most recent run status.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRun ? (
              <div className="grid gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="text-foreground">{recentRun.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duration</span>
                  <span className="text-foreground">{formatDuration(recentRun.durationMs)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Run ID</span>
                  <span className="text-foreground">{recentRun.runId}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No runs yet.</p>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>Last 5 executions.</CardDescription>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs yet.</p>
            ) : (
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                {runs.slice(0, 5).map((run) => (
                  <div key={run.runId} className="flex items-center justify-between">
                    <span className="truncate">{run.status}</span>
                    <span className="text-foreground">{formatDuration(run.durationMs)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>Plan and run jobs for this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {!workflows && (
            <p className="text-xs text-muted-foreground">Load workflows to get started.</p>
          )}
          {workflows && workflows.length === 0 && (
            <p className="text-xs text-muted-foreground">No workflows found in this workspace.</p>
          )}
          {workflows && workflows.length > 0 && (
            <div className="flex flex-col gap-4">
              {workflows.map((wf) => (
                <div key={wf.file} className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{wf.name || "Workflow"}</p>
                    <p className="text-xs text-muted-foreground">{wf.file}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {wf.jobs?.map((job: Job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2"
                      >
                        <span className="truncate text-xs text-muted-foreground">
                          {job.name || job.id}
                        </span>
                        <Button size="sm" onClick={() => runJob(job.id, wf)} disabled={isRunning}>
                          Run
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Run output</CardTitle>
          <CardDescription>Live output from the most recent run.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 pb-2">
            <p className="text-xs text-muted-foreground">
              {isRunning ? "Running" : logs.length > 0 ? "Idle" : "No runs yet"}
            </p>
            {isRunning && (
              <Button size="xs" variant="destructive" onClick={stopJob}>
                Stop
              </Button>
            )}
          </div>
          <Separator />
          <div className="max-h-56 overflow-auto pt-3">
            <LogViewer logs={logs} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
