import type { Workspace } from "../types/core";

const baseUrl = "http://localhost:5174";

export async function getActiveWorkspace(): Promise<Workspace | null> {
	const res = await fetch(`${baseUrl}/workspace`, { method: "GET" });
	if (!res.ok) throw new Error("Failed to load workspace");
	const data = await res.json();
	return data.result as Workspace | null;
}

export async function pickWorkspace(): Promise<Workspace | null> {
	const res = await fetch(`${baseUrl}/workspace/pick`, { method: "POST" });
	if (!res.ok) throw new Error("Failed to open workspace picker");
	const data = await res.json();
	if (data.error) throw new Error(data.error);
	return data.result as Workspace | null;
}
