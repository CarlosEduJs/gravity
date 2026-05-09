import { useCallback, useEffect, useState } from "react";
import { gravity } from "../lib/gravityClient";

type BridgeStatus = "checking" | "online" | "offline";
type BridgeInfo = { port: number; channel: string; startedAt: string } | null;

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 300;

export function useBridgeStatus() {
	const [status, setStatus] = useState<BridgeStatus>("checking");
	const [info, setInfo] = useState<BridgeInfo>(null);

	const runCheck = useCallback(async () => {
		setStatus("checking");
		let nextInfo: BridgeInfo = null;
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
			nextInfo = await gravity.getBridgeInfo();
			if (nextInfo) break;
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
		}
		setInfo(nextInfo);
		setStatus(nextInfo ? "online" : "offline");
	}, []);

	useEffect(() => {
		runCheck();
	}, [runCheck]);

	return {
		status,
		info,
		retry: runCheck,
	};
}
