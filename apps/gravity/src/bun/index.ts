import { createCoreBridge } from "./core";
import { startServer } from "./server";
import { createMainWindow } from "./window";

const coreBridge = createCoreBridge();
const bridgeInfo = await startServer({ coreBridge });
await createMainWindow(bridgeInfo);

console.log("Gravity App started!");
