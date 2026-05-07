import { BrowserWindow, Updater, Utils } from "electrobun/bun";
import { spawn } from "bun";
import { createHash } from "crypto";
import { join, resolve, basename } from "path";
import { existsSync } from "fs";
import { homedir } from "os";
import { mkdir, readFile, writeFile } from "fs/promises";

import type { GravityEvent, RPCResponse, RPCNotification } from "../types/core";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

type Workspace = {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
};

type WorkspaceIndex = {
  lastActive: string | null;
  items: Workspace[];
};

const gravityHome = join(homedir(), ".gravity");
const workspaceIndexPath = join(gravityHome, "workspaces.json");

async function ensureGravityHome() {
  await mkdir(gravityHome, { recursive: true });
}

function workspaceIdFromPath(path: string) {
  return createHash("sha256").update(path).digest("hex").slice(0, 12);
}

async function loadWorkspaceIndex(): Promise<WorkspaceIndex> {
  await ensureGravityHome();
  try {
    const contents = await readFile(workspaceIndexPath, "utf-8");
    const parsed = JSON.parse(contents) as WorkspaceIndex;
    return {
      lastActive: parsed.lastActive ?? null,
      items: parsed.items ?? [],
    };
  } catch {
    return { lastActive: null, items: [] };
  }
}

async function saveWorkspaceIndex(index: WorkspaceIndex) {
  await ensureGravityHome();
  await writeFile(workspaceIndexPath, JSON.stringify(index, null, 2));
}

async function ensureProjectGravityDir(workspacePath: string) {
  const gravityDir = join(workspacePath, ".gravity");
  await mkdir(gravityDir, { recursive: true });
  const configPath = join(gravityDir, "config.json");
  const statePath = join(gravityDir, "state.json");
  if (!existsSync(configPath)) {
    await writeFile(configPath, JSON.stringify({}, null, 2));
  }
  if (!existsSync(statePath)) {
    await writeFile(statePath, JSON.stringify({}, null, 2));
  }
}

async function ensureGitignore(workspacePath: string) {
  const gitignorePath = join(workspacePath, ".gitignore");
  const entry = ".gravity/";
  if (!existsSync(gitignorePath)) {
    await writeFile(gitignorePath, `${entry}\n`);
    return;
  }
  const contents = await readFile(gitignorePath, "utf-8");
  if (!contents.split(/\r?\n/).includes(entry)) {
    const suffix = contents.endsWith("\n") ? "" : "\n";
    await writeFile(gitignorePath, `${contents}${suffix}${entry}\n`);
  }
}

async function setActiveWorkspace(path: string) {
  const resolvedPath = resolve(path);
  const index = await loadWorkspaceIndex();
  const id = workspaceIdFromPath(resolvedPath);
  const now = new Date().toISOString();
  const existing = index.items.find((item) => item.id === id);
  const workspace: Workspace = {
    id,
    name: existing?.name ?? basename(resolvedPath),
    path: resolvedPath,
    lastOpenedAt: now,
  };

  const nextItems = existing
    ? index.items.map((item) => (item.id === id ? workspace : item))
    : [workspace, ...index.items];

  const nextIndex: WorkspaceIndex = {
    lastActive: id,
    items: nextItems,
  };

  await ensureProjectGravityDir(resolvedPath);
  await ensureGitignore(resolvedPath);
  await saveWorkspaceIndex(nextIndex);

  return workspace;
}

async function getActiveWorkspace(): Promise<Workspace | null> {
  const index = await loadWorkspaceIndex();
  if (!index.lastActive) return null;
  const workspace = index.items.find((item) => item.id === index.lastActive) ?? null;
  if (!workspace) return null;
  if (!existsSync(workspace.path)) return null;
  return setActiveWorkspace(workspace.path);
}

// --- GRAVITY CORE BRIDGE ---
function findCoreBinary() {
  const cwd = process.cwd();
  const pathsToTry = [
    join(cwd, "../../../..", "bin", "gravity-core"),
    join(cwd, "bin", "gravity-core"),
    resolve(cwd, "../../../../../bin/gravity-core"),
  ];

  for (const p of pathsToTry) {
    if (existsSync(p)) {
      return p;
    }
  }

  return join(cwd, "gravity-core");
}

const corePath = findCoreBinary();
console.log("Attempting to start gravity-core at:", corePath);

if (!existsSync(corePath)) {
  console.error(
    `CRITICAL: gravity-core binary not found at ${corePath}. Make sure to run 'go build' in packages/core.`,
  );
}

const coreProcess = spawn({
  cmd: [corePath],
  stdin: "pipe",
  stdout: "pipe",
  stderr: "inherit",
});

const pendingRequests = new Map();

// SSE Clients Registry
const sseClients = new Set<(event: GravityEvent) => void>();

async function listenToCore() {
  if (!coreProcess.stdout) return;
  const reader = coreProcess.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line) as RPCResponse | RPCNotification<GravityEvent>;

        if ("method" in response && response.method === "gravity.event") {
          for (const client of sseClients) {
            client(response.params as GravityEvent);
          }
        } else if (
          "id" in response &&
          response.id !== undefined &&
          pendingRequests.has(response.id)
        ) {
          const { resolve, reject } = pendingRequests.get(response.id);
          pendingRequests.delete(response.id);
          if (response.error) reject(new Error(response.error.message));
          else resolve(response.result);
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error("Failed to parse core output:", e.message);
        }
      }
    }
  }
}
listenToCore();

const bridgePort = 5174;
let currentWorkspace: Workspace | null = await getActiveWorkspace();
Bun.serve({
  port: bridgePort,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname === "/workspace" && req.method === "GET") {
      if (!currentWorkspace) {
        return Response.json({ result: null }, { headers: { "Access-Control-Allow-Origin": "*" } });
      }
      return Response.json(
        { result: currentWorkspace },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    if (url.pathname === "/workspace" && req.method === "POST") {
      try {
        const body = await req.json();
        if (!body?.path || typeof body.path !== "string") {
          return Response.json(
            { error: "path é obrigatório" },
            { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        currentWorkspace = await setActiveWorkspace(body.path);
        return Response.json(
          { result: currentWorkspace },
          { headers: { "Access-Control-Allow-Origin": "*" } },
        );
      } catch (e: unknown) {
        return Response.json(
          { error: e instanceof Error ? e.message : String(e) },
          { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }
    }

    if (url.pathname === "/workspace/pick" && req.method === "POST") {
      try {
        const [selectedPath] = await Utils.openFileDialog({
          startingFolder: currentWorkspace?.path ?? "~/",
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });
        if (!selectedPath) {
          return Response.json(
            { result: null },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        currentWorkspace = await setActiveWorkspace(selectedPath);
        return Response.json(
          { result: currentWorkspace },
          { headers: { "Access-Control-Allow-Origin": "*" } },
        );
      } catch (e: unknown) {
        return Response.json(
          { error: e instanceof Error ? e.message : String(e) },
          { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }
    }

    // Endpoint Server-Sent Events para os Logs e Status
    if (url.pathname === "/events" && req.method === "GET") {
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (event: GravityEvent) => {
            controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
          };
          sseClients.add(sendEvent);

          req.signal.addEventListener("abort", () => {
            sseClients.delete(sendEvent);
          });
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (
      (url.pathname === "/plan" || url.pathname === "/run" || url.pathname === "/stop") &&
      req.method === "POST"
    ) {
      try {
        const body = await req.json();
        const requestId = Math.floor(Math.random() * 1000000);
        const workspacePath = body.workdir || currentWorkspace?.path;
        if (!workspacePath) {
          return Response.json(
            { error: "workspace não selecionado" },
            { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        const absoluteWorkdir = resolve(workspacePath);
        currentWorkspace = await setActiveWorkspace(absoluteWorkdir);

        const params: Record<string, string> = { workdir: absoluteWorkdir };
        if (body.job) params.job = body.job;
        if (body.runId) params.runId = body.runId;

        const rpcReq = {
          jsonrpc: "2.0",
          method: url.pathname.replace("/", ""), // "plan", "run" ou "stop"
          params: params,
          id: requestId,
        };

        const result = await new Promise((resolve, reject) => {
          pendingRequests.set(requestId, { resolve, reject });
          coreProcess.stdin.write(JSON.stringify(rpcReq) + "\n");
          coreProcess.stdin.flush();
        });

        return Response.json({ result }, { headers: { "Access-Control-Allow-Origin": "*" } });
      } catch (e: unknown) {
        return Response.json(
          { error: e instanceof Error ? e.message : String(e) },
          { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
});
console.log(`Gravity Bridge API listening on http://localhost:${bridgePort}`);
// --- END GRAVITY CORE BRIDGE ---

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
    }
  }
  return "views://mainview/index.html";
}

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
  title: "Gravity",
  url,
  frame: {
    width: 1000,
    height: 800,
    x: 200,
    y: 200,
  },
});

console.log("Gravity App started!");
