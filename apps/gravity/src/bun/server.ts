import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { Utils, Updater } from "electrobun/bun";
import { resolve } from "path";

import type { GravityEvent, WorkspaceState, Workspace } from "../types/core";
import type { CoreBridge } from "./types";
import {
  getActiveWorkspace,
  listWorkspaces,
  readWorkspaceState,
  setActiveWorkspace,
  writeWorkspaceState,
} from "./workspace";
import { writeBridgeInfo } from "./bridge";

type ServerOptions = {
  coreBridge: CoreBridge;
};

type ServerState = {
  workspace: Workspace | null;
  port: number;
  sseClients: Set<(event: GravityEvent) => void>;
};

const PORT_START = 9800;
const PORT_END = 9810;

function basePortForChannel(channel: string) {
  if (channel === "dev") return 9805;
  if (channel === "canary") return 9810;
  return 9800;
}

async function getChannel() {
  try {
    return await Updater.localInfo.channel();
  } catch {
    return "stable";
  }
}

function tryServe(port: number, app: any): boolean {
  try {
    app.listen(port);
    return true;
  } catch {
    return false;
  }
}

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function createGravityApp(
  state: ServerState,
  channel: string,
  startedAt: string,
  coreBridge: CoreBridge,
) {
  return new Elysia()
    .use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
      }),
    )
    .get("/health", () => ({
      status: "ok" as const,
      port: state.port,
      channel,
    }))
    .get("/bridge", () => ({
      port: state.port,
      channel,
      startedAt,
    }))
    .get("/workspace", () => ({
      result: state.workspace,
    }))
    .get("/workspaces", async ({ status }) => {
      try {
        const items = await listWorkspaces();
        return { result: items };
      } catch (e: unknown) {
        return status(500, { error: toErrorMessage(e) });
      }
    })
    .get("/workspace/state", async ({ status }) => {
      if (!state.workspace) {
        return { result: { runs: [] } };
      }
      try {
        const wsState = await readWorkspaceState(state.workspace.path);
        return { result: wsState };
      } catch (e: unknown) {
        return status(500, { error: toErrorMessage(e) });
      }
    })
    .post(
      "/workspace/state",
      async ({ body, status }) => {
        if (!state.workspace) {
          return status(400, { error: "No workspace selected" });
        }
        try {
          const wsState: WorkspaceState = body;
          await writeWorkspaceState(state.workspace.path, wsState);
          return { result: wsState };
        } catch (e: unknown) {
          return status(500, { error: toErrorMessage(e) });
        }
      },
      {
        body: t.Object({
          runs: t.Array(
            t.Object({
              runId: t.String(),
              status: t.Union([
                t.Literal("running"),
                t.Literal("success"),
                t.Literal("error"),
                t.Literal("canceled"),
              ]),
              startedAt: t.String(),
              finishedAt: t.Union([t.String(), t.Null()]),
              durationMs: t.Union([t.Number(), t.Null()]),
              event: t.Optional(t.String()),
              jobId: t.Optional(t.String()),
              workflowName: t.Optional(t.String()),
              workflowFile: t.Optional(t.String()),
            }),
          ),
          lastWorkflowPlanAt: t.Optional(t.String()),
          workflowCount: t.Optional(t.Number()),
          jobCount: t.Optional(t.Number()),
        }),
      },
    )
    .post(
      "/workspace",
      async ({ body, status }) => {
        try {
          state.workspace = await setActiveWorkspace(body.path);
          return { result: state.workspace };
        } catch (e: unknown) {
          return status(500, { error: toErrorMessage(e) });
        }
      },
      {
        body: t.Object({
          path: t.String(),
        }),
      },
    )
    .post("/workspace/pick", async ({ status }) => {
      try {
        const [selectedPath] = await Utils.openFileDialog({
          startingFolder: state.workspace?.path ?? "~/",
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });
        if (!selectedPath) {
          return { result: null };
        }
        state.workspace = await setActiveWorkspace(selectedPath);
        return { result: state.workspace };
      } catch (e: unknown) {
        return status(500, { error: toErrorMessage(e) });
      }
    })
    .get("/events", ({ request }) => {
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (event: GravityEvent) => {
            controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
          };
          state.sseClients.add(sendEvent);

          request.signal.addEventListener("abort", () => {
            state.sseClients.delete(sendEvent);
          });
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    })
    .post(
      "/plan",
      async ({ body, status }) => {
        const workspacePath = body.workdir || state.workspace?.path;
        if (!workspacePath) {
          return status(400, { error: "No workspace selected" });
        }
        try {
          const absoluteWorkdir = resolve(workspacePath);
          const result = await coreBridge.sendRequest("plan", {
            workdir: absoluteWorkdir,
          });
          return { result };
        } catch (e: unknown) {
          console.error("[plan] Error:", e);
          return status(500, { error: toErrorMessage(e) });
        }
      },
      {
        body: t.Object({
          workdir: t.Optional(t.String()),
        }),
      },
    )
    .post(
      "/run",
      async ({ body, status }) => {
        const workspacePath = body.workdir || state.workspace?.path;
        if (!workspacePath) {
          return status(400, { error: "No workspace selected" });
        }
        try {
          const absoluteWorkdir = resolve(workspacePath);
          const params: Record<string, string> = { workdir: absoluteWorkdir };
          if (body.job) params.job = body.job;
          const result = await coreBridge.sendRequest("run", params);
          return { result };
        } catch (e: unknown) {
          console.error("[run] Error:", e);
          return status(500, { error: toErrorMessage(e) });
        }
      },
      {
        body: t.Object({
          workdir: t.Optional(t.String()),
          job: t.Optional(t.String()),
        }),
      },
    )
    .post(
      "/stop",
      async ({ body, status }) => {
        try {
          const params: Record<string, string> = {};
          if (body.runId) params.runId = body.runId;
          const result = await coreBridge.sendRequest("stop", params);
          return { result };
        } catch (e: unknown) {
          console.error("[stop] Error:", e);
          return status(500, { error: toErrorMessage(e) });
        }
      },
      {
        body: t.Object({
          runId: t.Optional(t.String()),
        }),
      },
    )
    .onError(({ code, status }) => {
      if (code === "NOT_FOUND") {
        return status(404, { error: "Not found" });
      }
    });
}

export type GravityApp = ReturnType<typeof createGravityApp>;

export async function startServer({ coreBridge }: ServerOptions) {
  const channel = await getChannel();
  const basePort = basePortForChannel(channel);
  const startedAt = new Date().toISOString();

  const state: ServerState = {
    workspace: await getActiveWorkspace(),
    port: 0,
    sseClients: new Set(),
  };

  coreBridge.onEvent((event) => {
    for (const client of state.sseClients) {
      client(event);
    }
  });

  const app = createGravityApp(state, channel, startedAt, coreBridge);

  for (let port = basePort; port <= PORT_END; port += 1) {
    if (tryServe(port, app)) {
      state.port = port;
      break;
    }
  }
  if (!state.port && basePort !== PORT_START) {
    for (let port = PORT_START; port < basePort; port += 1) {
      if (tryServe(port, app)) {
        state.port = port;
        break;
      }
    }
  }
  if (!state.port) {
    throw new Error("Failed to bind bridge port");
  }

  await writeBridgeInfo({
    port: state.port,
    channel,
    startedAt,
  });

  console.log(`Gravity Bridge API listening on http://localhost:${state.port}`);
  return { port: state.port, channel, startedAt };
}
