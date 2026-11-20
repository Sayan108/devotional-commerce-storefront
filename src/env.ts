export const env = {
  apiUrl: "https://devotional-commerce-backend.onrender.com"
} as const;

export function assetUrl(path = "") {
  if (path.startsWith("/media/") || path.startsWith("/admin/")) return env.apiUrl + path;
  return path;
}
