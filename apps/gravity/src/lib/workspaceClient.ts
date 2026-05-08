import type { Workspace } from "../types/core";
import { gravity } from "./gravityClient";

export async function getActiveWorkspace(): Promise<Workspace | null> {
  return gravity.getWorkspace();
}

export async function pickWorkspace(): Promise<Workspace | null> {
  return gravity.pickWorkspace();
}
