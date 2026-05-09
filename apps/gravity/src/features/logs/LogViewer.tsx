import { useEffect, useRef } from "react";

import { cn } from "@gravity/ui/lib/utils";

import type { LogLine } from "./useGravityEvents";

type LogViewerProps = {
	logs: LogLine[];
};

export default function LogViewer({ logs }: LogViewerProps) {
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [logs]);

	return (
		<div className="flex h-full flex-col">
			{logs.length === 0 ? (
				<p className="text-xs text-muted-foreground">Waiting for execution...</p>
			) : (
				<div className="flex flex-col gap-1 font-mono text-xs/relaxed">
					{logs.map((log) => {
						const isSystem = log.type === "system";
						const isStarted = log.type.includes("started");
						const isFinished = log.type.includes("finished");
						const isError =
							log.text.includes("CANCELED") ||
							log.text.includes("FAILED") ||
							log.text.includes("failure") ||
							log.text.includes("ERROR:");

						return (
							<div
								key={log.id}
								className={cn(
									"whitespace-pre-wrap text-muted-foreground",
									isSystem && "font-semibold text-foreground",
									isStarted && "font-semibold text-foreground",
									isFinished && "font-semibold text-foreground",
									isError && "text-destructive",
								)}
							>
								{log.text}
							</div>
						);
					})}
				</div>
			)}
			<div ref={endRef} />
		</div>
	);
}
