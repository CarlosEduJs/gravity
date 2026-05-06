import { useMemo } from "react";
import { useGravityEvents } from "../../features/logs/useGravityEvents";
import LogViewer from "../../features/logs/LogViewer";
import { gravity } from "../../lib/gravityClient";

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
	const { logs, endRef, isRunning, currentRunId } = useGravityEvents();

	const statusLabel = useMemo(() => {
		if (isRunning) return "In progress";
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
