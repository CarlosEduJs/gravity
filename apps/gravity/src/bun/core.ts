import { spawn } from "bun";
import { existsSync } from "fs";
import { join, resolve } from "path";

import type { GravityEvent, RPCNotification, RPCResponse } from "../types/core";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type CoreBridge = {
  sendRequest: (method: string, params: Record<string, string>) => Promise<unknown>;
  onEvent: (handler: (event: GravityEvent) => void) => () => void;
};

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

export function createCoreBridge(): CoreBridge {
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

  const pendingRequests = new Map<number, PendingRequest>();
  const eventHandlers = new Set<(event: GravityEvent) => void>();

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
            for (const handler of eventHandlers) {
              handler(response.params as GravityEvent);
            }
          } else if (
            "id" in response &&
            response.id !== undefined &&
            pendingRequests.has(response.id)
          ) {
            const { resolve, reject } = pendingRequests.get(response.id) as PendingRequest;
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

  async function sendRequest(method: string, params: Record<string, string>) {
    const requestId = Math.floor(Math.random() * 1000000);
    const rpcReq = {
      jsonrpc: "2.0",
      method,
      params,
      id: requestId,
    };

    return await new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
      coreProcess.stdin.write(JSON.stringify(rpcReq) + "\n");
      coreProcess.stdin.flush();
    });
  }

  function onEvent(handler: (event: GravityEvent) => void) {
    eventHandlers.add(handler);
    return () => eventHandlers.delete(handler);
  }

  return { sendRequest, onEvent };
}
