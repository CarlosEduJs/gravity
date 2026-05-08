import { createCoreBridge } from "./core";
import { startServer } from "./server";
import { createMainWindow } from "./window";

const coreBridge = createCoreBridge();
await startServer({ coreBridge });
await createMainWindow();

console.log("Gravity App started!");
