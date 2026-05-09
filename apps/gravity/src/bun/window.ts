import { BrowserWindow, Updater } from "electrobun/bun";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

type BridgeInfo = {
	port: number;
	channel: string;
	startedAt: string;
};

async function getMainViewUrl(bridgeInfo?: BridgeInfo): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			const url = new URL(DEV_SERVER_URL);
			if (bridgeInfo?.port) {
				url.searchParams.set("bridgePort", String(bridgeInfo.port));
			}
			return url.toString();
		} catch {
			console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
		}
	}
	const url = new URL("views://mainview/index.html");
	if (bridgeInfo?.port) {
		url.searchParams.set("bridgePort", String(bridgeInfo.port));
	}
	return url.toString();
}

export async function createMainWindow(bridgeInfo?: BridgeInfo) {
	const url = await getMainViewUrl(bridgeInfo);

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

  return mainWindow;
}
