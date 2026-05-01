import { useState, useEffect, useRef } from "react";
import type { Workflow, GravityEvent, Job } from "../types/core";

import { Button } from "@gravity/ui/components/button";

function App() {
	const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	const [logs, setLogs] = useState<{id: string, text: string, type: string}[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [currentRunId, setCurrentRunId] = useState<string | null>(null);
	
	const logsEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const evtSource = new EventSource("http://localhost:5174/events");
		
		evtSource.onmessage = (event) => {
			const data = JSON.parse(event.data) as GravityEvent;
			
			if (data.type === "log.output") {
				setLogs((prev) => [...prev, {
					id: data.id,
					text: data.payload.message,
					type: "log"
				}]);
			} else if (data.type === "run.started") {
				setCurrentRunId(data.runId);
				setLogs((prev) => [...prev, {
					id: data.id,
					text: `RUN STARTED (Job: ${data.payload.event || 'all'})`,
					type: "system"
				}]);
			} else if (data.type === "run.finished") {
				const statusMap = {
					success: "RUN SUCCESSFUL",
					canceled: "RUN CANCELED",
					error: "RUN FAILED"
				};
				const statusText = statusMap[data.payload.status] || `RUN FINISHED (${data.payload.status})`;

				setLogs((prev) => [...prev, {
					id: data.id,
					text: statusText,
					type: "system"
				}]);
				setIsRunning(false);
				setCurrentRunId(null);
			}
		};

		return () => {
			evtSource.close();
		};
	}, []);

	useEffect(() => {
		if (logsEndRef.current) {
			logsEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [logs]);

	const loadWorkflows = async () => {
		setLoading(true);
		setError(null);
		
		try {
			const res = await fetch("http://localhost:5174/plan", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workdir: "../../../../../../" }) 
			});

			const data = await res.json();
			if (data.error) {
				setError(data.error);
			} else {
				setWorkflows(data.result);
			}
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	};

	const runJob = async (jobId: string) => {
		setIsRunning(true);
		setLogs([]); 
		setError(null);
		
		try {
			fetch("http://localhost:5174/run", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workdir: "../../../../../../", job: jobId }) 
			});
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
			setIsRunning(false);
		}
	};

	const stopJob = async () => {
		if (!currentRunId) return;
		try {
			await fetch("http://localhost:5174/stop", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ runId: currentRunId }) 
			});
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	return (
		<div className="min-h-screen p-8 flex flex-col">
			<div className="container mx-auto max-w-6xl flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div>
					<h1 className="text-4xl font-bold mb-2 tracking-tight">
						Gravity <span>Core</span>
					</h1>
					<p className="text-lg mb-8">
						Local Runtime Dashboard
					</p>

					<div className="border rounded-xl p-6 ">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-2xl font-semibold">Workflows</h2>
							</div>
							<Button
								onClick={loadWorkflows}
								disabled={loading || isRunning}
								variant={"default"}
							>
								{loading ? "Planejando..." : "Carregar Planos"}
							</Button>
						</div>

						{error && (
							<div className="p-4 rounded-lg mb-6 font-mono text-sm">
								Erro: {error}
							</div>
						)}

						{workflows && (
							<div className="space-y-4">
								{workflows.length === 0 ? (
									<p className="italic">Nenhum workflow encontrado.</p>
								) : (
									workflows.map((wf, i) => (
										<div key={i} className="rounded-lg p-4">
											<h3 className="text-lg font-medium mb-1">
												{wf.name || "Unnamed Workflow"}
											</h3>
											<p className="text-xs mb-4 font-mono">{wf.file}</p>
											
											<div className="flex flex-col gap-2">
												{wf.jobs?.map((job: Job, j: number) => (
													<div key={j} className="flex items-center justify-between pl-3 pr-2 py-2 rounded border border-white/5 hover:border-indigo-500/30 transition-colors">
														<span className="font-mono text-sm text-muted-foreground">{job.name || job.id}</span>
														
														<Button 
															onClick={() => runJob(job.id)}
															disabled={isRunning}
															variant={"default"}
														>
															Run
														</Button>
													</div>
												))}
											</div>
										</div>
									))
								)}
							</div>
						)}
					</div>
				</div>

				<div className="flex flex-col rounded-xl overflow-hidden border h-[80vh] sticky top-8">
					<div className="bg-card px-4 py-3 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-red-500/80"></div>
							<div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
							<div className="w-3 h-3 rounded-full bg-green-500/80"></div>
							<span className="ml-2 text-sm font-medium text-gray-400 font-mono">gravity-terminal</span>
						</div>
						{isRunning && (
							<div className="flex items-center gap-4">
								<Button 
									onClick={stopJob} 
									variant="destructive" 
								>
									Stop
								</Button>
								<span className="flex h-3 w-3 relative">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
								</span>
							</div>
						)}
					</div>
					
					<div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed">
						{logs.length === 0 ? (
							<p className="italic">Waiting for execution...</p>
						) : (
							logs.map((log) => (
								<div key={log.id} className={`${log.type === 'system' ? 'text-indigo-400  my-2' : 'text-accent'}`}>
									{log.text}
								</div>
							))
						)}
						<div ref={logsEndRef} />
					</div>
				</div>

			</div>
		</div>
	);
}

export default App;
