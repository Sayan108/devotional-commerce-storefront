export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? "" : "https://devotional-commerce-backend.onrender.com")).replace(/\/+$/, "")
} as const;

export function assetUrl(path = "") {
  if (path.startsWith("/media/") || path.startsWith("/admin/")) return env.apiUrl + path;
  return path;
}
