import type { Workflow, GravityEvent, Workspace, WorkspaceState } from "../types/core";

const PORTS = [9800, 9805, 9810, 9801, 9802, 9803, 9804, 9806, 9807, 9808, 9809] as const;

// ── Response shapes ─────────────────────────────────────────────────────

type ApiResult<T> = { result: T; error?: undefined };
type ApiError = { error: string; result?: undefined };
type ApiResponse<T> = ApiResult<T> | ApiError;

function isApiError<T>(data: ApiResponse<T>): data is ApiError {
	return "error" in data && typeof data.error === "string";
}

/** Fetch JSON from the bridge and validate the response envelope. */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init);
	if (!res.ok) {
		throw new Error(`Requisição falhou (${res.status}): ${url}`);
	}
	const data = (await res.json()) as ApiResponse<T>;
	if (isApiError(data)) {
		throw new Error(data.error);
	}
	return data.result;
}

// ── Client ──────────────────────────────────────────────────────────────

export class GravityClient {
	private baseUrl: string;
	private eventSource: EventSource | null = null;
	private listeners: Set<(event: GravityEvent) => void> = new Set();
	private connectionPromise: Promise<void> | null = null;

	constructor(baseUrl?: string) {
		let resolvedUrl: string | null = null;

		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			const urlPort = url.searchParams.get("bridgePort");
			if (urlPort) {
				resolvedUrl = `http://localhost:${Number(urlPort)}`;
			}
		}

		this.baseUrl = resolvedUrl ?? baseUrl ?? "http://localhost:9800";
	}

	private ensureConnected(): Promise<void> {
		if (this.connectionPromise) return this.connectionPromise;
		this.connectionPromise = this.doConnect().catch((e: unknown) => {
			this.connectionPromise = null;
			throw e;
		});
		return this.connectionPromise;
	}

	private async doConnect(): Promise<void> {
		const tryPort = async (port: number): Promise<boolean> => {
			try {
				const res = await fetch(`http://localhost:${port}/health`, {
					method: "GET",
					signal: AbortSignal.timeout(500),
				});
				return res.ok;
			} catch {
				return false;
			}
		};

		const currentPort = new URL(this.baseUrl).port;
		if (currentPort && (await tryPort(Number(currentPort)))) {
			return;
		}

		for (const port of PORTS) {
			if (await tryPort(port)) {
				this.baseUrl = `http://localhost:${port}`;
				return;
			}
		}

		throw new Error("Failed to connect to Gravity Bridge");
	}

	private invalidateConnection(): void {
		this.connectionPromise = null;
	}

	/** Wrapper that auto-connects and invalidates on network failures. */
	private async request<T>(
		path: string,
		init?: RequestInit,
	): Promise<T> {
		await this.ensureConnected();
		try {
			return await fetchJson<T>(`${this.baseUrl}${path}`, init);
		} catch (e: unknown) {
			if (e instanceof TypeError) this.invalidateConnection();
			throw e;
		}
	}

	async getBridgeInfo(): Promise<{ port: number; channel: string; startedAt: string } | null> {
		await this.ensureConnected();
		try {
			const res = await fetch(`${this.baseUrl}/bridge`, { method: "GET" });
			if (!res.ok) return null;
			return (await res.json()) as { port: number; channel: string; startedAt: string };
		} catch {
			this.invalidateConnection();
			return null;
		}
	}

	async getWorkspace(): Promise<Workspace | null> {
		return this.request<Workspace | null>("/workspace", { method: "GET" });
	}

	async setWorkspace(path: string): Promise<Workspace> {
		const result = await this.request<Workspace>("/workspace", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path }),
		});
		this.invalidateConnection();
		return result;
	}

	async pickWorkspace(): Promise<Workspace | null> {
		return this.request<Workspace | null>("/workspace/pick", { method: "POST" });
	}

	async listWorkspaces(): Promise<Workspace[]> {
		const result = await this.request<Workspace[]>("/workspaces", { method: "GET" });
		return result ?? [];
	}

	async getWorkspaceState(): Promise<WorkspaceState> {
		const result = await this.request<WorkspaceState>("/workspace/state", { method: "GET" });
		return result ?? { runs: [] };
	}

	async updateWorkspaceState(state: WorkspaceState): Promise<WorkspaceState> {
		const result = await this.request<WorkspaceState>("/workspace/state", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(state),
		});
		return result ?? { runs: [] };
	}

	async plan(workdir?: string): Promise<Workflow[]> {
		return this.request<Workflow[]>("/plan", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(workdir ? { workdir } : {}),
		});
	}

	async runJob(workdir: string | undefined, jobId: string): Promise<{ runId: string }> {
		return this.request<{ runId: string }>("/run", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...(workdir ? { workdir } : {}), job: jobId }),
		});
	}

	async stopJob(runId: string): Promise<boolean> {
		const result = await this.request<{ stopped: boolean }>("/stop", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ runId }),
		});
		return result.stopped;
	}

	subscribe(onEvent: (event: GravityEvent) => void): () => void {
		this.ensureConnected().catch(() => {});
		this.listeners.add(onEvent);

		if (!this.eventSource) {
			this.eventSource = new EventSource(`${this.baseUrl}/events`);
			this.eventSource.onmessage = (event: MessageEvent<string>) => {
				try {
					const data = JSON.parse(event.data) as GravityEvent;
					for (const listener of this.listeners) {
						listener(data);
					}
				} catch (e: unknown) {
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