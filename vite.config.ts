import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const { ARGHYA_API_URL } = loadEnv(mode, process.cwd(), "ARGHYA_");
  const target = ARGHYA_API_URL || "http://127.0.0.1:4000";
  const proxy = { "/v1": target, "/media": target };
  return {
    plugins: [react()],
    server: { proxy, strictPort: true },
    preview: { proxy, strictPort: true }
  };
});
