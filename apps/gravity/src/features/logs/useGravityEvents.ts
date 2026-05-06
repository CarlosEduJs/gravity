import { useEffect, useRef, useState } from "react";
import type { GravityEvent } from "../../types/core";
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

export function useGravityEvents() {
	const [logs, setLogs] = useState<LogLine[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [currentRunId, setCurrentRunId] = useState<string | null>(null);
	const endRef = useRef<HTMLDivElement>(null);

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
				const statusText = statusMap[data.payload.status] ?? `RUN FINISHED (${data.payload.status})`;
				setLogs((prev) => [
					...prev,
					{ id: data.id, text: statusText, type: "system" },
				]);
				setIsRunning(false);
				setCurrentRunId(null);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [logs]);

	const clearLogs = () => setLogs([]);

	return {
		logs,
		isRunning,
		currentRunId,
		endRef,
		clearLogs,
	};
}
