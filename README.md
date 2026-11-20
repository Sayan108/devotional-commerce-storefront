# Arghya Storefront

Install and start from this directory with Node.js 22.

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The development and preview servers proxy `/v1` and `/media` to the API URL in `src/env.ts`.

Run the API for catalog, sign-in, and checkout. [Arghya API](https://github.com/Sayan108/devotional-commerce-backend) · [Seller admin](https://github.com/Sayan108/devotional-commerce-admin)

Run `npm run build` to produce `dist/`. In production, route `/v1/*` and `/media/*` on the storefront domain to the API so session cookies stay same-origin. Serve the remaining routes from `dist/` with an `index.html` fallback for client-side routes. Keep private routes out of search indexes.

The UI lives in `src/app`, customer flows in `src/features`, shared utilities in `src/shared`, and storefront artwork in `public/artwork`.
