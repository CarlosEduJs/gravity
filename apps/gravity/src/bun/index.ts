import { BrowserWindow, Updater } from "electrobun/bun";
import { spawn } from "bun";
import { join, resolve } from "path";
import { existsSync } from "fs";

import type { GravityEvent, RPCResponse, RPCNotification } from "../types/core";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// --- GRAVITY CORE BRIDGE ---
function findCoreBinary() {
    const cwd = process.cwd();
    const pathsToTry = [
        join(cwd, "../../../..", "bin", "gravity-core"), 
        join(cwd, "bin", "gravity-core"),
        resolve(cwd, "../../../../../bin/gravity-core")
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
    console.error(`CRITICAL: gravity-core binary not found at ${corePath}. Make sure to run 'go build' in packages/core.`);
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
				} 
				else if ("id" in response && response.id !== undefined && pendingRequests.has(response.id)) {
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
		        }
		    });
		    return new Response(stream, {
		        headers: {
		            "Content-Type": "text/event-stream",
		            "Cache-Control": "no-cache",
		            "Connection": "keep-alive",
		            "Access-Control-Allow-Origin": "*"
		        }
		    });
		}

		if ((url.pathname === "/plan" || url.pathname === "/run" || url.pathname === "/stop") && req.method === "POST") {
			try {
				const body = await req.json();
				const requestId = Math.floor(Math.random() * 1000000);
				const absoluteWorkdir = resolve(process.cwd(), body.workdir || ".");

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

				return Response.json(
					{ result },
					{ headers: { "Access-Control-Allow-Origin": "*" } }
				);
			} catch (e: unknown) {
				return Response.json(
					{ error: e instanceof Error ? e.message : String(e) },
					{ status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
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
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
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
