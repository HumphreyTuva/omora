# Omora Platform (monorepo)
- `apps/api` NestJS + Prisma + PostgreSQL (REST at /api/v1)
- `apps/web` Next.js (App Router, TypeScript)

## Run
1. `npm install`
2. `npm run db:up` (Postgres + Redis via Docker)
3. `cp apps/api/.env.example apps/api/.env`
4. `npm run db:push && npm run db:seed`
5. `npm run dev:api` (http://localhost:4000) and `npm run dev:web` (http://localhost:3000)

## Done
Schema (users, sellers, categories, products, orders, order_items, payments, shipments, reviews, payouts, commissions), OTP login + JWT + role guard, categories and product search/sort/pagination, seeded data, storefront page on live API data.
## Next
Cart + multi-vendor orders and state machine, M-Pesa (Daraja) payments, seller portal, admin, animated sidebar and cart in Next.js.

## Update 2: orders & payments (API)
Auth header: `Authorization: Bearer <token>` (get it from `/auth/otp/verify`).
- `POST /orders` `{items:[{productId,quantity}]}` → splits per seller, reserves stock atomically, computes commission per category (free delivery from KSh 20,000, else KSh 350)
- `POST /payments/initiate` `{orderId, phone}` → M-Pesa STK push (mock mode by default; `POST /payments/dev/confirm/:paymentId` simulates approval)
- `POST /payments/mpesa/callback` → verifies reference + amount, then marks order PAID
- `PATCH /orders/items/:id/status` (SELLER) → validated by the state machine in `src/orders/state.ts`
- `POST /seller/products` (SELLER) → PENDING_REVIEW; `PATCH /admin/products/:id/approve`, `/admin/sellers/:id/verify`, `GET /admin/overview` (ADMIN)
Seeded logins use OTP: sellers `+254700000000`–`04`, admin `+254700000099`.

## Update 3: web interactions
Next.js now has: animated mobile sidebar, cart drawer (saved in browser), phone-OTP sign-in modal, and checkout that calls `/orders` then `/payments/initiate`. Mock mode auto-approves payment. Needs the API running.

## Update 4
Product detail page (`/products/[id]`) and My Orders page (`/orders`) with status chips per seller item. Product cards now link to the detail page.

## Update 5: seller portal
Web `/seller` (Overview, Orders, Products) and API `GET /seller/orders|products|earnings`. Sign in as seller `+254700000000` (code prints in API terminal). Earnings: Delivered = available, in-progress = pending (commission deducted; payment/delivery fee deductions not yet applied).

## Update 6: admin dashboard
Web `/admin` (sign in as `+254700000099`): overview numbers, verify/reject/suspend sellers, approve/reject products, recent orders. API: `GET /admin/sellers|products/pending|orders`, `PATCH /admin/sellers/:id/reject|suspend`, `PATCH /admin/products/:id/reject`.

## Update 7
Seller sign-up (`/seller/apply`, API `POST /sellers/apply`): customer applies, store waits as PENDING_VERIFICATION until an admin verifies it at `/admin`. Home page now has the animated hero slider, promo banners and trust bar.

## Update 8: reviews & payouts
Verified-purchaser reviews (`POST /reviews`, only after DELIVERED; rate from My Orders; shown on product page). Seller payout requests (`POST /seller/payouts`, min KSh 500; balance reduced by requested payouts). Admin Payouts tab: send money via M-Pesa yourself, then "Mark as paid" with the reference (automated B2C payouts not built yet).

## Update 9: cancellations & refunds
`POST /orders/:id/cancel` (before processing; restocks; paid orders become refund requests), `POST /orders/:id/refund-request` (delivered orders), admin Refunds tab (`GET /admin/refunds`, `PATCH /admin/refunds/:id/approve|reject`). Money is returned manually by admin, then marked refunded. Run `npm run db:push` again (new `refundReason` column). No 7-day return-window check yet.

## Update 10: wishlist & commission settings
Wishlist: heart on product cards (sign-in required), `/wishlist` page, API `GET /wishlist`, `POST /wishlist/:productId` (toggle). Admin Commissions tab: edit each category's rate (0–50%); applies to new orders. Run `npm run db:push` again (new WishlistItem table).

## Update 11: search filters & coupons
Home page filters (sort, min/max price, rating, in stock) via API query params. Coupons: admin Coupons tab (percent or KSh off, min spend, max uses, expiry), cart coupon box (`GET /coupons/check`), applied in `POST /orders {coupon}`. Omora funds the discount (seller commission is on full price). Seeded code: WELCOME10 (10% off, min KSh 1,000). Run `npm run db:push` and `npm run db:seed` again.

## Update 12: delivery & tracking
Logistics provider interface (`apps/api/src/logistics/providers.ts`; built-in `OMORA` provider, add others by implementing the same interface). Flow: seller marks item Ready for pickup, then admin Logistics tab: Create shipment, then advance Picked up, In transit, Out for delivery, Delivered (moves order + items). Customers: Track delivery on My Orders, `/track/[orderId]`. Delivery fee now comes from the provider quote. Run `npm run db:push` again (ShipmentEvent table).

## Update 13: notifications & SMS
Central `NotificationsService` (in-app + SMS). Sign-in codes now go through the SMS service. Customers are notified on payment, seller confirm/processing/ready, each delivery step, refunds; sellers on new orders and payouts. Bell in the header and `/notifications` page (polls every 30s). SMS_MODE=mock prints `[DEV SMS]` lines in the API terminal; set SMS_MODE=live with Africa's Talking keys for real SMS. Run `npm run db:push` again.

## Update 14: email sign-in & product photos
Sign in with phone OR email (6-digit code; `EMAIL_MODE=mock` prints it in the API terminal, `live` uses any SMTP provider). Sellers upload up to 5 photos per product (JPG/PNG/WebP, 3 MB); stored in `apps/api/uploads` for testing or in Cloudflare R2 / any S3 service with `STORAGE_DRIVER=s3`. Products without photos keep the emoji. Run `npm install` and `npm run db:push` again (db:push may warn about renaming Otp.phone: accept it, OTP codes are temporary). Users can now have an email instead of a phone; checkout asks for the M-Pesa number once.
