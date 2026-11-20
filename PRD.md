# Storefront · Product requirements
## Buyers and core journey
A household shopper should be able to buy cotton wicks from a phone without opening an account. A family buying a puja package should know exactly what arrives, when it arrives and how much they pay today. Guests receive a private order-access link through their verified contact channel. Design first for a 360 px screen.

| Surface | Required behavior | Acceptance example |
|---|---|---|
| Home | Restrained editorial hero, shop essentials, package feature, PIN entry and support. CMS orders modules. | An unpublished collection never leaks through a featured tile. A poster appears with motion disabled. |
| Shop and search | Browse lamps, incense, wicks, ritual cloth and kits. Filters for category, price and in-stock. Match Bengali and Roman aliases. | “সলতে”, “solte” and “wick” find the same item. Back navigation preserves filters. |
| Product | Real SKU imagery, material, size/count, variant, price, stock, handling and delivery check. | Selecting a different pack changes quantity label, price and availability together. |
| PIN check | Six-digit input; return locality and 24-hour eligibility or reason and retry. Recheck full address at checkout. | Unsupported, temporarily paused and invalid PIN each get different copy. |
| Packages | Compare contents per drop, number of drops, first-delivery deadline, future dates, total incl. delivery and renewal terms. | A buyer can distinguish four weekly drops from one monthly drop before paying. |
| Bag | Adjust quantity/remove, keep local bag across reload, show separate delivery and total. | Stale price or sold-out line prompts explicit review before payment. |
| Checkout | Name, verified phone or email, delivery phone, house/street, locality, PIN and partner-required map point. Show quote expiry. | Only a fresh quote can open payment. Closing payment leaves recoverable order status. |
| Receipt and tracking | Price breakdown, order reference, deadline in IST, payment status, package dates, courier milestones and support. | A pending payment after browser close resolves to its final state on return. |
| Help | Seller contact, shipping, cancellation, damaged-item and refund policies linked from checkout and order detail. | Support can locate a purchase using reference and authenticated buyer contact. |

## Package offer for seller review
Example weekly plan covers four deliveries seven days apart. Each drop could contain 14 wicks and one incense pack. Example monthly plan covers three calendar-month deliveries, each with 60 wicks, two incense packs and two clay lamps. Show actual pack units and seller-approved substitution choices; default to buyer consent for changes. Price and imagery require seller approval. Charge once for the full term and offer “Buy again” at expiry. The first drop is due inside 24 hours of placement. Later drops follow dates accepted at checkout. Show how a holiday or short month changes a date before purchase.

## Measurement and release
Instrument product_view, pin_checked, add_to_cart, quote_ready, payment_started, purchase and tracking_opened. Purchase is counted once per paid order from the backend. Track package purchase and manual renewal separately. Keep names, phone numbers, addresses, map coordinates and private links out of analytics. Acceptance includes a low-bandwidth Android checkout, voice/keyboard use, a duplicate tap and a failed payment retry.
