import { Utils } from "electrobun/bun";
import { resolve } from "path";

import type { GravityEvent, WorkspaceState } from "../types/core";
import type { CoreBridge } from "./types";
import {
  getActiveWorkspace,
  listWorkspaces,
  readWorkspaceState,
  setActiveWorkspace,
  writeWorkspaceState,
} from "./workspace";

type ServerOptions = {
  coreBridge: CoreBridge;
  port?: number;
};

export async function startServer({ coreBridge, port = 5174 }: ServerOptions) {
  let currentWorkspace = await getActiveWorkspace();
  const sseClients = new Set<(event: GravityEvent) => void>();

  coreBridge.onEvent((event) => {
    for (const client of sseClients) {
      client(event);
    }
  });

  Bun.serve({
    port,
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

      if (url.pathname === "/workspaces" && req.method === "GET") {
        try {
          const items = await listWorkspaces();
          return Response.json({ result: items }, { headers: { "Access-Control-Allow-Origin": "*" } });
        } catch (e: unknown) {
          return Response.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
      }

      if (url.pathname === "/workspace/state" && req.method === "GET") {
        if (!currentWorkspace) {
          return Response.json(
            { result: { runs: [] } },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        try {
          const state = await readWorkspaceState(currentWorkspace.path);
          return Response.json(
            { result: state },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        } catch (e: unknown) {
          return Response.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
      }

      if (url.pathname === "/workspace/state" && req.method === "POST") {
        if (!currentWorkspace) {
          return Response.json(
            { error: "workspace não selecionado" },
            { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        try {
          const body = (await req.json()) as WorkspaceState;
          await writeWorkspaceState(currentWorkspace.path, body);
          return Response.json(
            { result: body },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        } catch (e: unknown) {
          return Response.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
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

      if ((url.pathname === "/plan" || url.pathname === "/run" || url.pathname === "/stop") && req.method === "POST") {
        try {
          const body = await req.json();
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

          const result = await coreBridge.sendRequest(url.pathname.replace("/", ""), params);
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

  console.log(`Gravity Bridge API listening on http://localhost:${port}`);
}
