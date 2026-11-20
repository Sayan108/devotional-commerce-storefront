# Storefront · Execution plan
Indicative workstream within the shared eight-week solo-developer schedule. Weeks overlap across projects. Seller handles operational decisions and partner onboarding. Progress by exit evidence.

| Week / phase | Implementation work | Exit evidence |
|---|---|---|
| 1 · Design | Approve brand direction, hero crop, catalog taxonomy and checkout fields with seller. Build route skeleton against fixtures. | Home, product and package page readable at 360 and 1440 px. |
| 2–3 · Discovery | Implement SSR catalog loaders, canonical pages, search aliases, cart persistence and provisional PIN check. Integrate real catalog and quote endpoints. | Publish one SKU in admin, find by alias, switch pack size, refresh bag and confirm revised server price. |
| 4–5 · Purchase | Add verified contact, address capture, per-order deadline, Razorpay JS load, private receipt and tracking. | Run captured, dismissed, failed and pending payments; reload after callback; see one reference and correct timeline. |
| 6 · Packages | Ship comparison, component quantities, concrete future dates, total prepaid amount, cancellation terms and manual renewal. | Buyer can explain all four weekly dates before payment; Jan 31 monthly preview matches backend. |
| 7 · Editorial | Wire published CMS, responsive hero, poster, motion opt-out, policies and structured data. Test sitemap and redirects against fixtures. | No drafts or private pages indexed; reduced-motion preference leaves a static poster. |
| 8 · Pilot | Measure mobile performance on representative device/network, complete assisted order and test support handoff. | Seller signs off actual item cards, Bengali copy, timing and published coverage wording. |

## Release and rollback
If checkout regresses, disable new payment entry at server and storefront while preserving private tracking. Roll back renderer separately; confirm current price and homepage revision after rollback.
