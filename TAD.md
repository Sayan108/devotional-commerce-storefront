# Storefront · Technical architecture
React Router framework mode with server-side rendering for public catalog routes. Deploy a small Node rendering process behind the same reverse proxy as Express. Express owns domain writes. The storefront reads published content using loaders. Render the home headline, product name, price and navigation in initial HTML; hydrate the bag and checkout controls afterward.

| Route | Data and rendering | Indexing/cache |
|---|---|---|
| / | Published CMS revision, approved hero and navigation | SSR, short shared cache, purge on publish |
| /shop, /collections/:slug | Published SKUs, cursor and finite category pages | Index canonical category pages, keep filter combinations out of sitemap |
| /products/:slug, /packages/:slug | SKU/plan version, media and current public price | Canonical, Product/Offer where applicable, breadcrumbs; 301 old slug, 404 absent |
| /search | Query and normalized alias lookup | noindex; accessible empty state |
| /bag, /checkout | Local versioned SKU IDs/quantities, fresh server quote | private, no-store, noindex |
| /orders/:reference | Private session after single-use access exchange | no-store, noindex, no referrer, mask contact details |
| /help/:slug | Published seller policy version | SSR with canonical URL |

## State and boundaries
Use URL state for filters, a small cart reducer persisted locally for nonsensitive line IDs, and server session for buyer identity. Clamp invalid quantities on restore; never persist checkout addresses in local storage. SSR and client use INR formatting and Asia/Kolkata consistently. Cache only public catalogue/marketing reads. Publish and price changes invalidate affected routes; quote always rereads canonical price and stock. Generate sitemap.xml from published records. Exclude preview and private paths. Use a 503 with retry hint during temporary upstream outage.

## Checkout contract
1. POST /v1/quotes with SKU quantities or plan ID, address and chosen start. Display integer-paise totals formatted to rupees, expiry and first deadline.
2. Submit quote ID plus a stable Idempotency-Key to POST /v1/orders. Retain the order reference across network retries. On 409 refresh quote and ask buyer to accept changes.
3. Load Razorpay Checkout only after an order exists. Pass server-provided gateway order ID and public key. Submit callback fields to /v1/payments/verify. Render “Checking payment” while awaiting capture. Poll private order status with bounded backoff and offer return link.
4. Clear only purchased bag lines after confirmed capture. If the quote changes while paying, use the stored order snapshot. Dispatch and email are server-side actions.

## Frontend QA targets
At mobile p75 aim for LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1. Reserve image dimensions, serve responsive WebP/AVIF, prioritize hero poster, defer video and avoid loading payment SDK on browse. Test initial HTML with JS off, canonical redirects, unavailable SKU, private access expiry, failed verification, two checkout tabs, 200% zoom, reduced motion, screen reader labels and back navigation. No personal data in page metadata. Track renderer 5xx, stale revisions and client checkout errors by correlation ID.
