import { homedir } from "os";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";

const gravityHome = join(homedir(), ".gravity");
const bridgeInfoPath = join(gravityHome, "bridge.json");

type BridgeInfo = {
	port: number;
	channel: string;
	startedAt: string;
};

export async function writeBridgeInfo(info: BridgeInfo) {
	await mkdir(gravityHome, { recursive: true });
	await writeFile(bridgeInfoPath, JSON.stringify(info, null, 2));
}
