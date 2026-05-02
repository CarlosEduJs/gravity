import type { Workflow, GravityEvent, Workspace } from "../types/core";

export class GravityClient {
	private baseUrl: string;
	private eventSource: EventSource | null = null;
	private listeners: Set<(event: GravityEvent) => void> = new Set();
	private workspace: Workspace | null = null;

	constructor(baseUrl = "http://localhost:5174") {
		this.baseUrl = baseUrl;
	}

	async getWorkspace(): Promise<Workspace | null> {
		if (this.workspace) return this.workspace;
		const res = await fetch(`${this.baseUrl}/workspace`, {
			method: "GET",
		});
		if (!res.ok) throw new Error("Falha ao carregar workspace");
		const data = await res.json();
		this.workspace = data.result as Workspace | null;
		return this.workspace;
	}

	async setWorkspace(path: string): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspace`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path }),
		});
		if (!res.ok) throw new Error("Falha ao definir workspace");
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		this.workspace = data.result as Workspace;
		return this.workspace;
	}

	async pickWorkspace(): Promise<Workspace | null> {
		const res = await fetch(`${this.baseUrl}/workspace/pick`, {
			method: "POST",
		});
		if (!res.ok) throw new Error("Falha ao abrir seletor de workspace");
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		this.workspace = data.result as Workspace | null;
		return this.workspace;
	}

	async plan(workdir?: string): Promise<Workflow[]> {
		const res = await fetch(`${this.baseUrl}/plan`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(workdir ? { workdir } : {}),
		});
		
		if (!res.ok) throw new Error("Falha de rede ao conectar com Gravity Bridge");
		
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		
		return data.result as Workflow[];
	}

	async runJob(workdir: string | undefined, jobId: string): Promise<{ runId: string }> {
		const res = await fetch(`${this.baseUrl}/run`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...(workdir ? { workdir } : {}), job: jobId }),
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
