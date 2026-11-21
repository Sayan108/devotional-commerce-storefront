# Naivedya Storefront

Install and start from this directory with Node.js 22.

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The development server proxies `/v1` and `/media` to the local API on port 4000. Set `ARGHYA_API_URL` in `.env.local` to point the proxy elsewhere.

Run the API for catalog, sign-in, and checkout. [Naivedya API](https://github.com/Sayan108/devotional-commerce-backend) · [Seller admin](https://github.com/Sayan108/devotional-commerce-admin)

Run `npm run build` to produce `dist/`. The production build defaults to the hosted API. Set `VITE_API_URL` at build time to use a different API. Set it to an empty string for a same-origin reverse proxy. Serve the frontend with an `index.html` fallback for client-side routes. Keep private routes out of search indexes.

The storefront can be installed as a PWA over HTTPS or on localhost. Supported browsers show an Install app action when they offer an install prompt; on iPhone and iPad, use Share and then Add to Home Screen in Safari. The action is hidden in the installed app and the native Capacitor app. The production web service worker caches only an offline notice, not catalog, account, or checkout data; shopping requires an internet connection.

The UI lives in `src/app`, customer flows in `src/features`, shared utilities in `src/shared`, and storefront artwork in `public/artwork`.
