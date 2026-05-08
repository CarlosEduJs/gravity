import type { GravityEvent } from "../types/core";

export type CoreBridge = {
  sendRequest: (method: string, params: Record<string, string>) => Promise<unknown>;
  onEvent: (handler: (event: GravityEvent) => void) => () => void;
};
