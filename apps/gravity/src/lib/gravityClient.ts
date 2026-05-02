import type { Workflow, GravityEvent } from "../types/core";

export class GravityClient {
	private baseUrl: string;
	private eventSource: EventSource | null = null;
	private listeners: Set<(event: GravityEvent) => void> = new Set();

	constructor(baseUrl = "http://localhost:5174") {
		this.baseUrl = baseUrl;
	}

	async plan(workdir: string): Promise<Workflow[]> {
		const res = await fetch(`${this.baseUrl}/plan`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ workdir }),
		});
		
		if (!res.ok) throw new Error("Falha de rede ao conectar com Gravity Bridge");
		
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		
		return data.result as Workflow[];
	}

	async runJob(workdir: string, jobId: string): Promise<{ runId: string }> {
		const res = await fetch(`${this.baseUrl}/run`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ workdir, job: jobId }),
		});
		
		if (!res.ok) throw new Error("Falha de rede ao iniciar o job");
		
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		
		return data.result as { runId: string };
	}

	async stopJob(runId: string): Promise<boolean> {
		const res = await fetch(`${this.baseUrl}/stop`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ runId }),
		});
		
		if (!res.ok) throw new Error("Falha de rede ao tentar abortar execução");
		
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		
		return data.result.stopped as boolean;
	}

	subscribe(onEvent: (event: GravityEvent) => void): () => void {
		this.listeners.add(onEvent);

		if (!this.eventSource) {
			this.eventSource = new EventSource(`${this.baseUrl}/events`);
			this.eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as GravityEvent;
					this.listeners.forEach(listener => listener(data));
				} catch (e) {
					console.error("Falha ao parsear evento do Gravity", e);
				}
			};
			this.eventSource.onerror = () => {
				console.error("Conexão com Gravity Bridge EventSource caiu. Reconectando...");
			};
		}

		return () => {
			this.listeners.delete(onEvent);
			if (this.listeners.size === 0 && this.eventSource) {
				this.eventSource.close();
				this.eventSource = null;
			}
		};
	}
}

export const gravity = new GravityClient();
