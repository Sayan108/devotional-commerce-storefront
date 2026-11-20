import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { env } from "./src/env.ts";

const proxy = { "/v1": env.apiUrl, "/media": env.apiUrl };

export default defineConfig({
  plugins: [react()],
  server: { proxy, strictPort: true },
  preview: { proxy, strictPort: true }
});