import { useState, useEffect, useRef } from "react";
import type { Workflow, Job } from "../types/core";
import { gravity } from "../lib/gravityClient";

import { Button } from "@gravity/ui/components/button";

function App() {
	const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [workspacePath, setWorkspacePath] = useState<string>("");
	const [workspaceName, setWorkspaceName] = useState<string>("");
	
	const [logs, setLogs] = useState<{id: string, text: string, type: string}[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [currentRunId, setCurrentRunId] = useState<string | null>(null);
	
	const logsEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		gravity.getWorkspace().then((workspace) => {
			if (workspace?.path) {
				setWorkspacePath(workspace.path);
				setWorkspaceName(workspace.name || workspace.path);
			}
		}).catch((e: unknown) => {
			setError(e instanceof Error ? e.message : String(e));
		});
	}, []);

	useEffect(() => {
		const unsubscribe = gravity.subscribe((data) => {
			if (data.type === "log.output") {
				setLogs((prev) => [...prev, {
					id: data.id,
					text: `      ${data.payload.message}`,
					type: "log.output"
				}]);
			} else if (data.type === "job.started") {
				setLogs((prev) => [...prev, {
					id: data.id,
					text: `▶ JOB: ${data.payload.name}`,
					type: "job.started"
				}]);
			} else if (data.type === "job.finished") {
				setLogs((prev) => [...prev, {
					id: data.id,
					text: `■ JOB FINISHED (Status: ${data.payload.status})`,
					type: "job.finished"
				}]);
			} else if (data.type === "step.started") {
				setLogs((prev) => [...prev, {
					id: data.id,
					text: `   ▶ STEP: ${data.payload.name}`,
					type: "step.started"
				}]);
			} else if (data.type === "step.finished") {
				setLogs((prev) => [...prev, {
					id: data.id,
					text: `   ■ STEP FINISHED (Status: ${data.payload.status})`,
					type: "step.finished"
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
		});

		return () => unsubscribe();
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
			const result = await gravity.plan(workspacePath || undefined);
			setWorkflows(result);
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
			gravity.runJob(workspacePath || undefined, jobId).catch(e => {
				setError(e instanceof Error ? e.message : String(e));
				setIsRunning(false);
			});
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
			setIsRunning(false);
		}
	};

	const selectWorkspace = async () => {
		try {
			const workspace = await gravity.pickWorkspace();
			if (!workspace) return;
			setWorkspacePath(workspace.path);
			setWorkspaceName(workspace.name || workspace.path);
			setWorkflows(null);
			setLogs([]);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		}
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
		<div className="min-h-screen p-8 flex flex-col">
			<div className="container mx-auto max-w-6xl flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div>
					<h1 className="text-4xl font-bold mb-2 tracking-tight">
						Gravity <span>Core</span>
					</h1>
					<p className="text-lg mb-8">
						Local Runtime Dashboard
					</p>

					<div className="border rounded-xl p-4 mb-6">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-xs uppercase tracking-wide">Workspace</p>
								<p className="text-sm font-mono">
									{workspacePath ? workspaceName : "Nenhum workspace selecionado"}
								</p>
							</div>
							<Button onClick={selectWorkspace} variant={"default"}>
								Selecionar
							</Button>
						</div>
					</div>

					<div className="border rounded-xl p-6 ">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-2xl font-semibold">Workflows</h2>
							</div>
							<Button
								onClick={loadWorkflows}
								disabled={loading || isRunning || !workspacePath}
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
							logs.map((log) => {
								let color = "text-gray-300";
								if (log.type === "system") color = "text-indigo-400 font-bold my-2";
								else if (log.type.includes("started")) color = "text-blue-400 font-semibold mt-2";
								else if (log.type.includes("finished")) color = "text-green-400 font-semibold mb-2";
								
								if (log.text.includes("CANCELED") || log.text.includes("FAILED") || log.text.includes("failure") || log.text.includes("ERROR:")) {
									color = "text-red-400 font-semibold";
								}

								return (
									<div 
										key={log.id} 
										className={`whitespace-pre-wrap ${color}`}
									>
										{log.text}
									</div>
								);
							})
						)}
						<div ref={logsEndRef} />
					</div>
				</div>

			</div>
		</div>
	);
}

export default App;
