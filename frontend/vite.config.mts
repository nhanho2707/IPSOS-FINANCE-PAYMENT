import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    // Same address as the old Create React App dev server: Docker publishes port 3000 and the e2e suite uses it.
    server: { host: true, port: 3000, strictPort: true },
    preview: { host: true, port: 3000, strictPort: true },
    // Docker and deployments pick the production bundle up from build/, where Create React App put it.
    build: { outDir: "build" },
});
