import { useMemo, useState } from "react";
import type { Job, Workflow } from "../../types/core";
import { gravity } from "../../lib/gravityClient";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useGravityEvents } from "../../features/logs/useGravityEvents";
import LogViewer from "../../features/logs/LogViewer";

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
	const { logs, endRef, clearLogs, isRunning, currentRunId } = useGravityEvents();
	const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const hasWorkspace = Boolean(activeWorkspace?.path);
	const workspaceName = activeWorkspace?.name ?? "";
	const workspacePath = activeWorkspace?.path ?? "";

	const terminalTitle = useMemo(() => {
		if (isRunning) return "Run in progress";
		if (logs.length > 0) return "Latest run";
		return "Run output";
	}, [isRunning, logs.length]);

	const loadWorkflows = async () => {
		if (!workspacePath) return;
		setLoading(true);
		setError(null);
		try {
			const result = await gravity.plan(workspacePath);
			setWorkflows(result);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	};

	const runJob = async (jobId: string) => {
		if (!workspacePath) return;
		clearLogs();
		setError(null);
		gravity.runJob(workspacePath, jobId).catch((e) => {
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
		<div className="flex h-full flex-col gap-6 p-4 ">
			<div className="flex items-start justify-between gap-4 bg-red-500">
				<div>
					<p className="text-xs text-muted-foreground">Workspace</p>
					<h1 className="text-lg font-semibold text-foreground">
						{workspaceName || "Workspace"}
					</h1>
					<p className="text-xs text-muted-foreground">
						{workspacePath || "No workspace selected"}
					</p>
				</div>
				<Button
					onClick={loadWorkflows}
					disabled={!hasWorkspace || loading}
				>
					{loading ? "Planning..." : "Load workflows"}
				</Button>
			</div>

			{error && (
				<Card size="sm">
					<CardContent>
						<p className="text-xs text-destructive">{error}</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Workflows</CardTitle>
					<CardDescription>Plan and run jobs from this workspace.</CardDescription>
				</CardHeader>
				<CardContent>
					{!workflows && (
						<p className="text-xs text-muted-foreground">
							Load workflows to get started.
						</p>
					)}
					{workflows && workflows.length === 0 && (
						<p className="text-xs text-muted-foreground">No workflows found.</p>
					)}
					{workflows && workflows.length > 0 && (
						<div className="flex flex-col gap-4">
							{workflows.map((wf) => (
								<div key={wf.file} className="flex flex-col gap-3">
									<div>
										<p className="text-sm font-medium text-foreground">
											{wf.name || "Workflow"}
										</p>
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
												<Button
													size="sm"
													onClick={() => runJob(job.id)}
													disabled={isRunning}
												>
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
					<CardTitle>{terminalTitle}</CardTitle>
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
						<LogViewer logs={logs} endRef={endRef} />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
