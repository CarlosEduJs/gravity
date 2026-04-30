import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	root: "src/mainview",
	resolve: {
		alias: {
			"@gravity/ui": path.resolve(__dirname, "../../packages/ui/src/styles"),
		},
	},
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: true,
	},
});
