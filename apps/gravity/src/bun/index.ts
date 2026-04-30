import { BrowserWindow, Updater } from "electrobun/bun";
import { spawn } from "bun";
import { join, resolve } from "path";
import { existsSync } from "fs";

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
				const response = JSON.parse(line);
				if (response.id && pendingRequests.has(response.id)) {
					const { resolve, reject } = pendingRequests.get(response.id);
					pendingRequests.delete(response.id);
					if (response.error) reject(new Error(response.error));
					else resolve(response.result);
				}
			} catch (e) {
				console.error("Failed to parse core output:", line);
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

		if (url.pathname === "/plan" && req.method === "POST") {
			try {
				const body = await req.json();
				const requestId = Math.floor(Math.random() * 1000000);

				const absoluteWorkdir = resolve(process.cwd(), body.workdir || ".");

				const rpcReq = {
					jsonrpc: "2.0",
					method: "plan",
					params: { workdir: absoluteWorkdir },
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
			} catch (e: any) {
				return Response.json(
					{ error: e.message },
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
