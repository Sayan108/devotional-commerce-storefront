import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "ARGHYA_");
  const api = env.ARGHYA_API_URL || "http://127.0.0.1:4000";
  const proxy = { "/v1": api, "/media": api };
  return {
    plugins: [react()],
    server: { proxy, strictPort: true },
    preview: { proxy, strictPort: true }
  };
});
