import { treaty } from "@elysiajs/eden";
import type { Workflow, GravityEvent, Workspace, WorkspaceState } from "../types/core";
import type { GravityApp } from "../bun/server";

const PORTS = [9800, 9805, 9810, 9801, 9802, 9803, 9804, 9806, 9807, 9808, 9809] as const;

export class GravityClient {
  private baseUrl: string;
  private api: ReturnType<typeof treaty<GravityApp>>;
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
    this.api = treaty<GravityApp>(this.baseUrl);
  }

  private setBaseUrl(url: string) {
    this.baseUrl = url;
    this.api = treaty<GravityApp>(this.baseUrl);
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
        this.setBaseUrl(`http://localhost:${port}`);
        return;
      }
    }

    throw new Error("Failed to connect to Gravity Bridge");
  }

  private invalidateConnection(): void {
    this.connectionPromise = null;
  }

  private async callApi<T>(request: Promise<{ data: any; error: any }>): Promise<T> {
    await this.ensureConnected();
    try {
      const { data, error } = await request;
      if (error) {
        throw new Error(error.value?.error ?? "Unknown API error");
      }
      return data?.result as T;
    } catch (e: unknown) {
      if (e instanceof TypeError || (e as Error).message === "Failed to fetch") {
        this.invalidateConnection();
      }
      throw e;
    }
  }

  async getBridgeInfo(): Promise<{ port: number; channel: string; startedAt: string } | null> {
    await this.ensureConnected();
    try {
      const { data, error } = await this.api.bridge.get();
      if (error) return null;
      return data as { port: number; channel: string; startedAt: string };
    } catch {
      this.invalidateConnection();
      return null;
    }
  }

  async getWorkspace(): Promise<Workspace | null> {
    return this.callApi<Workspace | null>(this.api.workspace.get());
  }

  async setWorkspace(path: string): Promise<Workspace> {
    const result = await this.callApi<Workspace>(this.api.workspace.post({ path }));
    this.invalidateConnection();
    return result;
  }

  async pickWorkspace(): Promise<Workspace | null> {
    return this.callApi<Workspace | null>(this.api.workspace.pick.post());
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const result = await this.callApi<Workspace[]>(this.api.workspaces.get());
    return result ?? [];
  }

  async getWorkspaceState(): Promise<WorkspaceState> {
    const result = await this.callApi<WorkspaceState>(this.api.workspace.state.get());
    return result ?? { runs: [] };
  }

  async updateWorkspaceState(state: WorkspaceState): Promise<WorkspaceState> {
    const result = await this.callApi<WorkspaceState>(this.api.workspace.state.post(state));
    return result ?? { runs: [] };
  }

  async plan(workdir?: string): Promise<Workflow[]> {
    return this.callApi<Workflow[]>(this.api.plan.post(workdir ? { workdir } : {}));
  }

  async runJob(workdir: string | undefined, jobId: string): Promise<{ runId: string }> {
    return this.callApi<{ runId: string }>(
      this.api.run.post({ ...(workdir ? { workdir } : {}), job: jobId }),
    );
  }

  async stopJob(runId: string): Promise<boolean> {
    const data = await this.callApi<{ stopped: boolean }>(this.api.stop.post({ runId }));
    return data.stopped;
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
