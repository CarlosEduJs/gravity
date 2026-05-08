import { createHash } from "crypto";
import { join, resolve, basename } from "path";
import { existsSync } from "fs";
import { homedir } from "os";
import { mkdir, readFile, writeFile } from "fs/promises";

import type { Workspace, WorkspaceState } from "../types/core";

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
    await writeFile(statePath, JSON.stringify({ runs: [] }, null, 2));
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

export async function listWorkspaces(): Promise<Workspace[]> {
  const index = await loadWorkspaceIndex();
  return [...index.items].sort((a, b) => {
    const aTime = new Date(a.lastOpenedAt).getTime();
    const bTime = new Date(b.lastOpenedAt).getTime();
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
    return bTime - aTime;
  });
}

export async function setActiveWorkspace(path: string) {
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

export async function getActiveWorkspace(): Promise<Workspace | null> {
  const index = await loadWorkspaceIndex();
  if (!index.lastActive) return null;
  const workspace = index.items.find((item) => item.id === index.lastActive) ?? null;
  if (!workspace) return null;
  if (!existsSync(workspace.path)) return null;
  return setActiveWorkspace(workspace.path);
}

export async function readWorkspaceState(workspacePath: string): Promise<WorkspaceState> {
  const statePath = join(workspacePath, ".gravity", "state.json");
  try {
    const raw = await readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as WorkspaceState;
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      lastWorkflowPlanAt: parsed.lastWorkflowPlanAt,
      workflowCount: parsed.workflowCount,
      jobCount: parsed.jobCount,
    };
  } catch {
    return { runs: [] };
  }
}

export async function writeWorkspaceState(workspacePath: string, state: WorkspaceState) {
  const statePath = join(workspacePath, ".gravity", "state.json");
  const nextState: WorkspaceState = {
    runs: Array.isArray(state.runs) ? state.runs : [],
    lastWorkflowPlanAt: state.lastWorkflowPlanAt,
    workflowCount: state.workflowCount,
    jobCount: state.jobCount,
  };
  await writeFile(statePath, JSON.stringify(nextState, null, 2));
}
