# Holo Swaps — Completed Work

---

## Backend Service (`holo-swaps-service`)

### Infrastructure & Setup
- [x] Express + TypeScript server with `express-async-errors`
- [x] Helmet, CORS, Morgan, rate limiting middleware
- [x] Winston logger
- [x] Centralized error handler (`ApiError` + `errorHandler` middleware)
- [x] Standardized API response helpers (`sendSuccess`, `sendCreated`, `sendError`)
- [x] Prisma ORM configured with PostgreSQL (Supabase)
- [x] Environment config validation on startup

### Database Schema (Prisma)
- [x] `User` — full user model with Stripe, reputation, bans, admin flag
- [x] `UserAddress` — address book per user
- [x] `Card` — card catalog supporting Pokemon, MTG, One Piece, Yu-Gi-Oh, Digimon
- [x] `CardPriceHistory` — time-series market prices from TCGPlayer
- [x] `PriceAlert` — user-defined price alerts (above/below target)
- [x] `UserCollection` — per-user card inventory with condition, grading, status, media, quantity
- [x] `UserWant` — want list with priority, condition preference, grading preference
- [x] `Trade` — full trade model with value snapshots, cash difference, Stripe payment intent; `cancellationRequestedById` field for mutual cancel flow
- [x] `TradeItem` — cards on each side of a trade
- [x] `TradeOffer` — counter-offer history
- [x] `TradeMessage` — in-trade messaging thread
- [x] `TradeMatch` + `TradeMatchItem` — auto-match suggestion system
- [x] `CardVerification` — admin card verification workflow
- [x] `Shipment` — tracking numbers, carrier, address snapshot, delivery status
- [x] `Dispute` + `DisputeEvidence` — dispute lifecycle with evidence
- [x] `TradeReview` — post-trade reviews (1 per person per trade)
- [x] `CardOwnershipHistory` — full card provenance chain
- [x] `CardMedia` — photos/video for collection items and verification
- [x] `Notification` — in-app notification with typed payload
- [x] `UserBlock` — block another user
- [x] `UserReport` — report a user (optionally tied to a trade)
- [x] `DeviceToken` — Expo/APNs/FCM tokens for push notifications
- [x] `RefreshToken` — long-lived tokens for persistent sessions

### Auth API (`/api/auth`)
- [x] `POST /api/auth/register` — create account with hashed password
- [x] `POST /api/auth/login` — JWT issued on success, ban check
- [x] `POST /api/auth/refresh` — issue new JWT from existing valid token
- [x] `GET  /api/auth/me` — return authenticated user from token

### Trade API (`/api/trades`)
- [x] `POST   /api/trades` — propose a trade (ownership + availability validation)
- [x] `POST   /api/trades/:id/counter` — counter-offer with optional cash adjustment
- [x] `PATCH  /api/trades/:id/accept` — accept trade; creates Stripe PaymentIntent if cash owed
- [x] `PATCH  /api/trades/:id/decline` — receiver declines
- [x] `PATCH  /api/trades/:id/cancel` — direct cancel at PROPOSED/COUNTERED status
- [x] `POST   /api/trades/:id/request-cancel` — request mutual cancellation at ACCEPTED status; notifies + emails other party
- [x] `POST   /api/trades/:id/accept-cancel` — accept the other party's cancellation request; unlocks cards, emails both parties
- [x] `PATCH  /api/trades/:id/tracking` — submit tracking number + carrier; transitions to BOTH_SHIPPED when both submit
- [x] `GET    /api/trades` — paginated list of own trades, filterable by status
- [x] `GET    /api/trades/:id` — single trade detail (participants only)
- [x] `GET    /api/trades/matches` — mutual match suggestions based on collection vs wants
- [x] `PATCH  /api/trades/:id/verify` *(admin)* — card verification with photo review
- [x] `PATCH  /api/trades/:id/complete` *(admin)* — complete trade; captures Stripe payment, increments trade counts
- [x] `PATCH  /api/trades/:id/admin-dispute` *(admin)* — admin-initiated dispute with notes + optional Stripe refund

### Trade Messages API (`/api/trades/:id/messages`)
- [x] `GET  /api/trades/:id/messages` — fetch thread, auto-mark other party's messages as read
- [x] `POST /api/trades/:id/messages` — send a message

### Reviews API
- [x] `POST /api/trades/:id/reviews` — submit review for completed trade; recalculates subject's reputation score
- [x] `GET  /api/users/:username/reviews` — paginated reviews for a public profile

### Dispute API (`/api/disputes`, `/api/trades/:id/dispute`)
- [x] `POST  /api/trades/:id/dispute` — user opens dispute; trade status → DISPUTED
- [x] `GET   /api/disputes/:id` — get dispute detail (participants or admin only)
- [x] `POST  /api/disputes/:id/evidence` — submit evidence (media URLs + description); advances status to EVIDENCE_SUBMITTED
- [x] `PATCH /api/disputes/:id/resolve` *(admin)* — resolve dispute with outcome + resolution notes

### Collection API (`/api/collection`)
- [x] `GET    /api/collection` — own collection, paginated, filterable by `status`
- [x] `POST   /api/collection` — add a card (condition, foil, first edition, grading, asking value override)
- [x] `GET    /api/collection/:itemId` — single item (own or admin)
- [x] `PATCH  /api/collection/:itemId` — update item; blocked while `IN_TRADE` except for `quantity` field
- [x] `DELETE /api/collection/:itemId` — remove card; blocked while `IN_TRADE`

### Want List API (`/api/wants`)
- [x] `GET    /api/wants` — own want list (excludes fulfilled by default)
- [x] `POST   /api/wants` — add card with condition preference, priority, grading preference
- [x] `PATCH  /api/wants/:id` — update want preferences
- [x] `DELETE /api/wants/:id` — remove from want list

### Cards API (`/api/cards`)
- [x] `GET /api/cards` — search/filter by name, game, set code, set name (paginated)
- [x] `GET /api/cards/:id` — card detail + last 30 days price history
- [x] `GET /api/cards/:id/price` — latest market price snapshot

### User Profile API (`/api/users`)
- [x] `GET    /api/users/:username` — public profile (stats, avg rating, trade count)
- [x] `PATCH  /api/users/me` — update own profile (username, bio, location, avatar)
- [x] `GET    /api/users/me/addresses` — address book
- [x] `POST   /api/users/me/addresses` — add address; sets isDefault if flagged
- [x] `PATCH  /api/users/me/addresses/:id` — update address
- [x] `DELETE /api/users/me/addresses/:id` — delete address
- [x] `GET    /api/users/:userId/collection` — browse another user's AVAILABLE cards
- [x] `POST   /api/users/:userId/block` — block a user
- [x] `DELETE /api/users/:userId/block` — unblock a user
- [x] `POST   /api/users/:userId/report` — report a user (with optional tradeId)

### Notifications API (`/api/notifications`)
- [x] `GET   /api/notifications` — paginated list, filterable by unread; includes `unreadCount`
- [x] `PATCH /api/notifications/read-all` — mark all as read
- [x] `PATCH /api/notifications/:id/read` — mark single notification as read

### Price Alerts API (`/api/price-alerts`)
- [x] `GET    /api/price-alerts` — own active alerts (includes triggered if queried)
- [x] `POST   /api/price-alerts` — create alert (card + target price + ABOVE/BELOW direction)
- [x] `DELETE /api/price-alerts/:id` — delete alert

### Stripe / Payments API (`/api/stripe`, `/api/webhooks/stripe`)
- [x] `POST /api/stripe/setup-customer` — create Stripe Customer; idempotent
- [x] `POST /api/stripe/connect` — create Stripe Connect Express account + return onboarding URL; idempotent
- [x] `POST /api/webhooks/stripe` — webhook handler: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`

### Admin API (`/api/admin`) — requires `isAdmin`
- [x] `GET   /api/admin/users` — list users with optional search
- [x] `PATCH /api/admin/users/:id/ban` — ban user (cannot ban another admin)
- [x] `PATCH /api/admin/users/:id/unban` — unban user
- [x] `GET   /api/admin/trades` — list trades, filterable by status
- [x] `GET   /api/admin/disputes` — list all disputes with evidence
- [x] `GET   /api/admin/reports` — list user reports
- [x] `PATCH /api/admin/reports/:id/resolve` — mark report as resolved

### Trade API — Additional Endpoints
- [x] `PATCH /api/trades/:id/received` — confirm receipt of inbound shipment; drives `A_RECEIVED` → `B_RECEIVED` → `BOTH_RECEIVED`

### Auth API — Additional Endpoints
- [x] `POST /api/auth/logout` — revoke refresh token (sets `revokedAt`)

---

## Critical Logic Fixes

- [x] **Card locking on propose** — all trade items flipped to `IN_TRADE` with `lockedByTradeId` set inside a transaction
- [x] **Card unlocking on decline/cancel** — items reverted to `AVAILABLE` and `lockedByTradeId` cleared
- [x] **Ownership transfer on complete** — each `TradeItem` transfers `UserCollection.userId` to new owner, `CardOwnershipHistory` records created, cards set to `AVAILABLE`, all within a Prisma transaction
- [x] **Notification triggers** — `NotificationService` fires on: trade proposed, countered, accepted, cancelled, completed, shipment updated, dispute opened
- [x] **Shipment `receiverId`** — now correctly set to the counterparty on `submitTrackingNumber`; duplicate tracking submissions blocked
- [x] **Automated delivery detection** — AfterShip integration: tracking numbers registered on submit, delivery webhooks auto-advance `BOTH_SHIPPED → A_RECEIVED → B_RECEIVED → BOTH_RECEIVED` with no human intervention; notifies both parties when both cards are received
- [x] **RefreshToken DB table** — `AuthService` now issues, rotates, and revokes real DB-backed refresh tokens (30-day TTL, `revokedAt` on logout); `login` returns both `token` + `refreshToken`
- [x] **`TradeRepository.tradeInclude`** — fixed broken `proposerCollection`/`receiverCollection` references → `collectionItem` with card + media
- [x] **`findMatches` field refs** — fixed `availableForTrade` → `status: AVAILABLE` and `item.photos` → `item.media.map(m => m.url)`
- [x] **`VerifyCardsData`** — added `collectionItemId`, replaced `photos` with `mediaUrls`; verification now creates `CardMedia` entries linked to `CardVerification`
- [x] **Return shipping billing** — when a card fails verification, the at-fault party is invoiced $24 (flat rate covering both return labels) via Stripe Invoice (`send_invoice`, 7-day payment window); Stripe emails them a hosted payment link; failure to create invoice is logged but never throws; innocent party notified with no charge; at-fault party receives payment link in notification data

---

### Background Jobs
- [x] **Trade expiry job** — runs every hour via `setInterval`; sends `TRADE_EXPIRY_WARNING` notification 24 hours before expiry (idempotent — skips already-warned trades); auto-cancels `PROPOSED`/`COUNTERED` trades past `expiresAt` in a transaction (unlock cards + `TRADE_CANCELLED` notification to both parties); `proposeTrade` now sets `expiresAt = now + 7 days`

### Services
- [x] `AuthService` — register, login (device info), JWT sign/verify, DB-backed refresh token rotation, logout
- [x] `NotificationService` — fire-and-forget `notify` and `notifyMany` helpers (failures logged, never rethrown)
- [x] `TradeService` — full trade lifecycle with card locking, ownership transfer, notification triggers, receipt confirmation
- [x] `PricingService` — TCGPlayer API integration, live price fetch, cached market values
- [x] `StripeService` — customer, Connect Express, PaymentIntent (hold + capture + cancel), refund, webhook verification

### Repositories
- [x] `UserRepository` — findById, findByEmail, findByUsername, create, update, updateStripeAccount
- [x] `CollectionRepository` — findById, findByUserId (paginated + status filter), findAvailableForTrade, create, update, updateMarketValue, delete
- [x] `TradeRepository` — findById, findByTradeCode, findByUserId (paginated), findByStatus, create, updateStatus, updatePaymentIntent, generateTradeCode

---

## Session — 2026-04-22 (continued)

### Listing Price / Asking Price

- [x] **`listingController.ts`** — Extended `toggleListingSchema` to accept `askingPrice: z.number().min(0).optional()`. Updated `prisma.userCollection.update` call: when `list: true`, saves `isOpenListing: true`, `listingDescription`, and `askingValueOverride` (from `askingPrice` param or falls back to existing value); when `list: false`, saves `isOpenListing: false` and `askingValueOverride: null` (clears it on unlist)
- [x] **`collection.ts` (API client)** — Updated `toggleListing` signature to accept optional `askingPrice?: number` as 4th parameter; included in PATCH body
- [x] **`ListingModal.tsx`** (new file at `src/components/listings/ListingModal.tsx`) — Full modal for listing/editing a card listing: card context row (image, name, set, condition badge), market value reference with tooltip, asking price number input (DollarSign icon, optional, defaults to market value), listing description textarea, footer with "Remove Listing" (red outline, only when listed), Cancel, and "Publish Listing"/"Update Listing" (green) buttons. State resets via `useEffect` when `isOpen` changes. Calls `onSave(parseFloat(askingPrice) || null, description)` and `onUnlist()` + `onClose()`.
- [x] **`collection/page.tsx`** — Added `listingModalItem` state; replaced `toggleListingMutation` with direct API calls; `handleToggleListing` now opens `ListingModal` instead of immediately toggling; added `handleListingSave` and `handleListingUnlist` handlers that call `collectionApi.toggleListing` directly then invalidate query; rendered `<ListingModal>` in JSX near other dialogs; updated grid view "List" button text to show `$X.XX` when `askingValueOverride` is set; updated list view to show a small teal price indicator next to the Tag button when listed with a price
- [x] **`TradeProposalModal.tsx`** — `calculateTotalValue` now uses `askingValueOverride ?? currentMarketValue`; all price display lines in selected-cards and available-cards sections updated to show teal "Owner price" label when `askingValueOverride` is set, falling back to green market value display otherwise
- [x] **`CounterOfferModal.tsx`** — `myTotal` and `theirTotal` calculations updated to use `askingValueOverride ?? currentMarketValue`; price display lines in myCards (current + available to add) and theirCards sections updated with teal "Owner price" indicator when override is set

### Collection Quantity + IN_TRADE Lock

- [x] **Schema** — Added `quantity Int @default(1)` to `UserCollection` model; `prisma db push` applied
- [x] **`ICollectionRepository.ts`** — Added `quantity?: number` to both `CreateCollectionItemData` and `UpdateCollectionItemData`
- [x] **`CollectionRepository.ts`** — `create` method now passes `quantity: data.quantity ?? 1` to Prisma; `update` already spreads `...rest` so quantity flows through automatically
- [x] **`collectionController.ts`** — Added `quantity: z.number().int().min(1).max(99).optional()` to `addItemSchema` (auto-included in `updateItemSchema` via `.partial()`); changed IN_TRADE guard to allow requests where only `quantity` is being updated (all other fields still blocked)
- [x] **`types/index.ts`** — Added `quantity: number` to `CollectionItem` interface
- [x] **`lib/api/collection.ts`** — Added `quantity?: number` to `AddCollectionItemPayload`
- [x] **`collection/page.tsx`** — Updated `count` prop from `cardCounts[item.card.id]` to `item.quantity`; added `Lock` to lucide imports; grid card: added amber IN_TRADE overlay (Lock icon + "In Trade" label) with `z-30`, replaced action button bar with conditional rendering — IN_TRADE shows amber "In Active Trade" footer, otherwise shows normal Trade/List buttons; list card: replaced action buttons with conditional — IN_TRADE shows amber "In Trade" badge, otherwise shows normal buttons; `EditCardDialog`: added `quantity` state, IN_TRADE amber warning banner, quantity stepper field (−/number input/+), disabled condition/checkboxes/notes when IN_TRADE, save button sends only `{ quantity }` when IN_TRADE; `AddCardDialog`: added `quantity` state and stepper UI, included in `addMutation.mutate` call
- [x] **`trades/[tradeId]/page.tsx`** — Card price lines in "You're Trading" and "You're Receiving" sections updated to show teal "Owner price" indicator when `askingValueOverride` is set
- [x] **`listings/page.tsx`** — `ListingCard` price badge updated: teal color + "ASKING" label when `askingValueOverride` is set; green color (no label) when only `currentMarketValue`

---

### Listings Browse Page
- [x] `src/lib/api/listings.ts` — `Listing` interface + `listingsApi.getListings` (game, q, page, limit)
- [x] `src/app/listings/page.tsx` — full listings feed: game filter tabs, debounced name search, 6-col card grid, pagination; each card shows image, condition badge (color-coded), price, owner avatar + username + tier badge; "Make Offer" button opens `TradeProposalModal` pre-loaded with the listed card; "Your listing" label shown for own cards; "Sign in to offer" for unauthenticated users
- [x] `Navbar.tsx` — "Listings" link (Tag icon) added for non-admin users, desktop + mobile

---

## Session — 2026-04-22

### Admin Reports Dashboard + Detail
- [x] Schema: added `resolvedNote String?` to `UserReport`; new `UserReportMessage` model for threaded messaging — `prisma db push` applied
- [x] `GET /api/admin/reports/:reportId` — single report with messages
- [x] `POST /api/admin/reports/:reportId/messages` — admin sends message to reporter, fires `sendReportAdminReplyEmail` (fire-and-forget)
- [x] `PATCH /api/admin/reports/:reportId/resolve` — accepts optional `note`, saves as `resolvedNote`, fires `sendReportResolvedEmail` (fire-and-forget)
- [x] `IEmailService` + `EmailService` — added `sendReportAdminReplyEmail` and `sendReportResolvedEmail`
- [x] `support.ts` API client — added `ReportMessage` interface; updated `AdminReport` with `messages` + `resolvedNote`; added `getAdminReport`, `sendReportMessage`; updated `resolveReport` to accept optional `note`
- [x] `admin/reports/page.tsx` — rows converted to `<Link>` pointing to detail page; inline resolve removed; status badge shows Pending/Resolved
- [x] `admin/reports/[reportId]/page.tsx` — full detail: report info (reported/reporter/reason/details/trade ref), message thread, reply composer (emails reporter), resolve form with optional note (emails reporter on resolve)
- [x] `Navbar.tsx` — admin nav now shows "Support Board" + "Reports" as separate links (desktop + mobile)

### Admin Email on User Report
- [x] `IEmailService` — added `sendUserReportEmail` method
- [x] `EmailService` — `sendUserReportEmail` implementation with red-header alert, reporter/reported info, reason, details, "Review Report" button
- [x] `userController.ts` — after `userReport.create`, fires `sendUserReportEmail` to all admins (fire-and-forget)

### Trade Message Email Notification
- [x] Schema: added `emailOnTradeMessage Boolean @default(true)` to `User` — `prisma db push` applied
- [x] `IEmailService` — added `sendTradeMessageEmail` method
- [x] `EmailService` — `sendTradeMessageEmail` with indigo border, message preview, "Reply in Trade" button
- [x] `messageController.ts` — after message create, fire-and-forget email to recipient if `emailOnTradeMessage` is enabled
- [x] `authController.ts` — `GET /api/auth/me` now includes `emailOnTradeMessage` in select
- [x] `UserRepository.ts` — exported `selectSafeUser`; added `emailOnTradeMessage` to select
- [x] `types/index.ts` — added `emailOnTradeMessage: boolean` to `User` interface
- [x] `settings/page.tsx` — added "New message in a trade" checkbox to email preferences section

### Fix: Prisma `omit` inside `include` not supported (Prisma 5.10)
- [x] Exported `selectSafeUser` from `UserRepository.ts` and replaced all `omit: { passwordHash: true }` usages with `select: selectSafeUser` across: `TradeRepository.ts`, `adminRoutes.ts`, `disputeController.ts`, `messageController.ts`, `reviewController.ts`, `userController.ts`

### Dashboard Stat Card Links
- [x] `dashboard/page.tsx` — Total Trades links to `/trades`, Active Trades to `/trades?filter=active`, Completed to `/trades?filter=completed`
- [x] `trades/page.tsx` — reads `filter` param from URL on load via `useSearchParams`

### Fix: Recent Trade 404
- [x] `TradeCard.tsx` — corrected href from `/trade/${trade.id}` to `/trades/${trade.id}`

### Fix: Trade Item Card Names Showing "Unknown"
- [x] `types/index.ts` — Added `collectionItem?: CollectionItem` to `TradeItem` interface (the actual API response field, which was missing)
- [x] `TradeCard.tsx` — Updated card name resolution in both "You give" and "You receive" sections to check `collectionItem?.card` first (real API field), then fall back to `proposerCollection`/`receiverCollection`
- [x] `trades/page.tsx` — Same fix for card name display in trades list rows
- [x] `CounterOfferModal.tsx` — Removed `as any` cast from `getCollectionItem` helper (now properly typed)

### Counter Offer — Card Add/Remove
- [x] `TradeService.counterOffer` — rewritten to support full card swaps: validates new cards belong to user and are AVAILABLE, unlocks removed items, locks/creates new items, recalculates market values, all in a transaction
- [x] `tradesApi.counter` — corrected payload type to `proposerCollectionItemIds`/`receiverCollectionItemIds`/`proposerCashAdd`/`receiverCashAdd`/`message`
- [x] `CounterOfferModal.tsx` — new full-screen modal: pre-populates current trade items, browse + add from collection, remove cards, cash input, trade balance display, optional message
- [x] `trades/[tradeId]/page.tsx` — removed old inline counter form; integrated `CounterOfferModal` replacing all inline state + `handleCounter`

---

## Phase 1 Completion — Remaining Features (2026-04-15)

### Schema Changes
- [x] Added `CollectionVisibility` enum (`PUBLIC`, `PRIVATE`, `FOLLOWERS_ONLY`)
- [x] Added `UserTier` enum (`BRONZE`, `SILVER`, `GOLD`, `DIAMOND`)
- [x] Added `LISTING_OFFER` and `EMAIL_VERIFIED` to `NotificationType` enum
- [x] Added to `User`: `bannedAt`, `emailVerificationToken`, `emailVerificationExpiresAt`, `passwordResetToken`, `passwordResetExpiresAt`, `collectionVisibility`, `tier`
- [x] Added to `UserCollection`: `isOpenListing`, `listingDescription`

### Email Service
- [x] `IEmailService` interface — `sendVerificationEmail`, `sendPasswordResetEmail`
- [x] `EmailService` — nodemailer SMTP implementation with HTML templates; fire-and-forget (failures logged, never thrown)

### Auth Flows
- [x] `GET  /api/auth/verify-email` — validate token, mark `isEmailVerified = true`, clear token fields
- [x] `POST /api/auth/forgot-password` — always 200; generates reset token (1h TTL); sends email silently
- [x] `POST /api/auth/reset-password` — validate token, hash new password, revoke all refresh tokens
- [x] `register` now generates email verification token (32-byte hex, 24h TTL) and fires verification email

### Collection Visibility
- [x] `updateProfile` now accepts `collectionVisibility` field
- [x] `GET /api/users/:userId/collection` — enforces visibility: PRIVATE → 403, FOLLOWERS_ONLY → 403 with TODO for followers check

### Open Listings
- [x] `GET  /api/listings` — public feed of AVAILABLE+isOpenListing items, supports `game`, `q`, `page`, `limit`
- [x] `PATCH /api/collection/:itemId/listing` — authenticated; toggles `isOpenListing`; blocked if `IN_TRADE`
- [x] `POST /api/listings/:itemId/offer` — creates a full trade via `TradeService.proposeTrade`

### File Upload
- [x] `POST /api/upload` — multer memoryStorage, max 10MB, JPEG/PNG/WebP/MP4; uploads to Supabase Storage `card-media` bucket; returns public URL

### User Tier System
- [x] `recalculateTier(tradeCount, reputationScore)` util — DIAMOND/GOLD/SILVER/BRONZE thresholds
- [x] `completeTrade` — recalculates and persists tier for both parties after incrementing trade counts
- [x] `submitReview` — recalculates and persists tier for reviewed user after updating reputation score

### Price Refresh on View
- [x] `refreshTradePrices(tradeId, userId)` — fetches live prices for all trade items, updates `valueAtTimeOfTrade`, recalculates aggregate values, increments `priceRefreshCount`; capped at 3 refreshes
- [x] `POST /api/trades/:id/refresh-prices` — authenticated trade participant only

### Dependencies Added
- [x] `nodemailer` + `@types/nodemailer` — SMTP email sending
- [x] `multer` + `@types/multer` — multipart file upload (memory storage)
- [x] `@supabase/supabase-js` — Supabase Storage client

---

## Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL (Supabase)
- Prisma ORM
- JWT Authentication
- Stripe + Stripe Connect Express
- TCGAPIs for card pricing
- Supabase Storage for card photos
- AfterShip for shipment tracking
- Resend SDK for transactional emails (live, API key configured)

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand state management
- Axios for API calls

**Future:**
- React Native (Expo) for mobile
- Expo Push Notifications
- Google ML Kit for card scanning

---

## Frontend (`holo-swaps-ui`)

### Initial Setup & Infrastructure
- [x] Next.js 14 App Router with TypeScript
- [x] Tailwind CSS + custom gradient design system (blue-500, purple-600, slate-950)
- [x] Dark mode configured (`className="dark"` on html/body)
- [x] Axios API client with interceptors (`/lib/api/client.ts`)
- [x] Zustand state management for auth (`/lib/hooks/useAuth.ts`)
- [x] Environment config (`.env.local` with `NEXT_PUBLIC_API_URL`)
- [x] `FloatingLabelInput` component (`/components/ui/FloatingLabelInput.tsx`) — Facebook-style floating label, `forwardRef`, supports `rightElement`, `error`, `success` props

### Authentication
- [x] `/auth/login` — FloatingLabelInput fields, identifier + password, forgot password link
- [x] `/auth/register` — FloatingLabelInput fields, real-time username/email availability (500ms debounce), password match validation, terms checkbox
- [x] `/auth/forgot-password` — FloatingLabelInput email field, success state
- [x] `/auth/reset-password` — FloatingLabelInput password fields, match validation, token-from-URL, auto-redirect on success
- [x] `/verify-email` — email verification landing page (token-from-URL)
- [x] Auth API client (`/lib/api/auth.ts`): `register`, `login`, `me`, `checkUsername`, `checkEmail`, `resendVerificationEmail`, `forgotPassword`, `resetPassword`

### Email Verification
- [x] `EmailVerificationBanner` component shown on dashboard when `!user.isEmailVerified`
- [x] "Resend Email" button with loading state

### Landing Page
- [x] `/` — public hero, feature highlights, CTA buttons, responsive

### Dashboard
- [x] `/dashboard` — welcome, stats cards (Total/Active/Completed Trades, Reputation), recent trades, quick actions, email verification banner
- [x] Stat cards link to `/trades`, `/trades?filter=active`, `/trades?filter=completed`

### Card Browsing
- [x] `/cards` — compact grid (4-col), rarity color badges, shimmer hover
- [x] Available Traders sticky sidebar — shows holders for selected card
- [x] `+` button on card hover opens `CardDetailModal` (add to collection/wants)
- [x] Mass selection mode — checkbox overlay, select all/clear/exit
- [x] `BulkAddModal` — collection mode (condition, foil, 1st ed, availability) + wants mode (max condition + priority); per-card progress bar
- [x] `MultiCardTradersPanel` — card filter, condition filter, parallel holder fetches, propose trade per row
- [x] Cards API client (`/lib/api/cards.ts`): `searchCards`

### Collection Management
- [x] `/collection` — two tabs: **Collection** and **Want List** (URL param `?tab=wants`)
- [x] Grid/list view toggle, search, condition/set/foil/sort filters
- [x] `AddCardDialog` — two-step (search → set condition/foil/quantity/asking price)
- [x] `EditCardDialog` — edit condition, foil, 1st edition, notes, quantity stepper, asking price (`$` prefix); IN_TRADE amber warning locks all fields except quantity
- [x] Card tiles: uploaded photo shown (falls back to stock image), asking price in footer, IN_TRADE amber overlay + "In Active Trade" footer
- [x] "Mark Available" blocked until card has an uploaded photo — photo-required modal (centered popup, amber camera icon)
- [x] Want List tab — add/edit/delete wants, priority + condition filters, grid/list view, bulk delete with select mode
- [x] Collection API client (`/lib/api/collection.ts`): full CRUD + media upload

### Listings
- [x] `/listings` — public listing feed, game filter tabs, debounced search, 6-col grid, pagination
- [x] Card tile: uploaded photo (not stock image), condition badge, teal "ASKING" price badge or green market price
- [x] "Make Offer" opens `TradeProposalModal` pre-loaded with listed card; "Your listing" label for own cards
- [x] `Listings API client` (`/lib/api/listings.ts`)

### Trades
- [x] `/trades` — paginated trade list, status filter tabs (reads `?filter=` from URL), TradeCard rows
- [x] `/trades/[tradeId]` — full trade detail:
  - Trade header: status badge, trade code, "with [username]" clickable link
  - Both sides of the trade (cards + images + values + asking price indicator)
  - Stripe payment section (ACCEPTED): per-party "Complete My Payment" button, green "payment complete" badge, shipping gated until both pay
  - Tracking number submission form
  - Receipt confirmation button
  - In-trade messaging thread (auto-scroll on new messages, `messageCountRef`)
  - `CounterOfferModal` (full-screen, card add/remove, cash input, trade balance)
  - Styled decline modal (matches app modal pattern)
  - Styled cancel modal + mutual cancel request flow
  - Review section (COMPLETED status) — 5-star selector + comment, submit once
  - `?payment=success/cancelled` banner detection
- [x] `TradeProposalModal` — directional Trade Balance indicator, owner price (teal) vs market price (green)
- [x] Trades API client (`/lib/api/trades.ts`): full CRUD + counter + accept/decline/cancel + tracking + receipt + review + checkout URL

### Matches
- [x] `/matches` — mutual match suggestions, match cards with "You have / They want / They have / You want", propose trade button (opens `TradeProposalModal`)

### Profile
- [x] `/profile/[username]` — avatar, username, bio, location, stats (trades, reputation, tier badge), tabs: Collection | Reviews
- [x] Collection tab: browseable AVAILABLE cards with uploaded photos, search + condition + set + foil + sort filters, "Propose Trade" per card
- [x] Reviews tab: star rating display, paginated reviews
- [x] Follow/Unfollow button; "⋮" dropdown: Block/Unblock + Report
- [x] Report modal — reason dropdown (6 options) + optional details + success state
- [x] "You've blocked this user" badge when blocked
- [x] `/profile/[username]/followers` and `/profile/[username]/following` — follower/following lists
- [x] Users API client (`/lib/api/users.ts`): `getProfile`, `getUserCollection`, `getReviews`, `follow`, `unfollow`, `block`, `unblock`, `report`

### Friends
- [x] `/friends` — search users by username, follow/unfollow, tier badge, link to profile

### Settings
- [x] `/settings` — full settings page with sections:
  - **Profile**: edit username (availability check), bio, location
  - **Email Notifications**: toggles for Trade Proposed/Countered/Accepted/Declined/Cancelled/Message
  - **Address Book**: add/edit/delete addresses, Google Places autocomplete on line1, US state dropdown, set default
  - **Payments**: Stripe customer setup badge, Stripe Connect Express onboarding, `?setup=success` detection
  - **Account**: delete account flow (password confirmation modal)

### Support
- [x] `/support` — support ticket form: category dropdown (8 categories), urgency selector (Normal/High/Critical), trade ID field (for trade-related categories), subject + message, submit → creates ticket + shows ticket number
- [x] `/support/tickets/[ticketNumber]` — ticket detail: status, messages thread, reply composer
- [x] Support API client (`/lib/api/support.ts`)

### Static / Info Pages
- [x] `/faq` — FAQ accordion page
- [x] `/how-it-works` — step-by-step explainer
- [x] `/shipping-guide` — shipping instructions and recommendations
- [x] `/card-condition-guide` — condition grading reference
- [x] `/legal/tos` — Terms of Service
- [x] `/legal/privacy` — Privacy Policy

### Admin
- [x] `/admin/trades` — admin trade list, filterable by status
- [x] `/admin/trades/[tradeId]` — admin trade detail (verify, complete, dispute)
- [x] `/admin/reports` — reports list, resolve button, "show resolved" toggle, pagination
- [x] `/admin/reports/[reportId]` — report detail: reporter/reported info, message thread, reply composer (emails reporter), resolve with optional note
- [x] `/admin/support` — support ticket admin dashboard

### Navigation
- [x] Navbar: authenticated (Dashboard, Browse Cards, Listings, My Cards, Trades, Matches, Friends, Notifications bell, avatar dropdown) + unauthenticated (Sign In, Get Started)
- [x] Admin nav: Admin Trades, Support Board, Reports
- [x] Mobile nav (hamburger menu)
- [x] Footer component

### UI Components
- [x] `FloatingLabelInput` — floating label input with focus/value animations
- [x] `TradeCard` — trade summary row
- [x] `TradeStatusBadge` — color-coded status pill
- [x] `TradeProposalModal` — full trade builder
- [x] `CounterOfferModal` — full-screen counter offer
- [x] `CardDetailModal` — add card to collection or wants
- [x] `BulkAddModal` — bulk add selected cards
- [x] `CollectionCard` — card tile (grid/list)
- [x] `EmailVerificationBanner`
- [x] `Navbar`, `Footer`, `Providers`

### Database Seeding
- [x] CSV import script (`seedCardsFromCSV.ts`)
- [x] Successfully seeded 563 Pokémon cards from 8 sets
- [x] Cleanup script (`cleanupSeedData.ts`)

### API Integration
- [x] TCGAPIs integration (replaced TCGplayer)
- [x] CORS configuration fixed
- [x] Environment variables configured

---

## Session Work — 2026-04-22

### Backend — Email Notification Preferences

- [x] **Schema** — Added 5 boolean fields to `User` model, all `@default(true)`:
  `emailOnTradeProposed`, `emailOnTradeCountered`, `emailOnTradeAccepted`, `emailOnTradeDeclined`, `emailOnTradeCancelled`
  → ran `prisma db push`
- [x] **`IUserRepository`** — Added the 5 fields to `UpdateUserData` interface
- [x] **`UserRepository`** — Added the 5 fields to `selectSafeUser` so they are returned by all user queries
- [x] **`userController`** — Added the 5 optional boolean fields to `updateProfileSchema` so `PATCH /api/users/me` accepts them
- [x] **`authController`** — Added the 5 fields to the hardcoded `select` in `GET /api/auth/me` so `loadUser()` on the frontend returns them
- [x] **`IEmailService`** — Added `sendTradeCounterOfferEmail` signature
- [x] **`EmailService`** — Implemented `sendTradeCounterOfferEmail` with orange-themed HTML template matching existing email style
- [x] **`TradeService`** — Wired all email preference checks into the trade lifecycle:
  - `proposeTrade`: checks `receiver.emailOnTradeProposed` before sending
  - `counterOffer`: fetches counterparty, checks `emailOnTradeCountered`, sends counter email fire-and-forget
  - `acceptTrade`: checks `proposer.emailOnTradeAccepted` before sending
  - `declineTrade`: checks `proposer.emailOnTradeDeclined` before sending
  - `cancelTrade`: checks `other.emailOnTradeCancelled` before sending

### Frontend — Counter Offer UI

- [x] **`/trades/[tradeId]/page.tsx`** — Added full counter offer flow:
  - `canCounter` flag: `["PROPOSED", "COUNTERED"].includes(trade.status)` — both parties can counter
  - "Counter Offer" button (orange) in trade actions section
  - Inline form: cash amount input + message textarea + Send/Cancel buttons
  - `handleCounter` calls `tradesApi.counter(tradeId, { cashAdjustment, message })`
  - Fixed scroll-to-bottom bug using `messageCountRef` (only scrolls when new messages arrive, not on every render)

### Frontend — Email Notification Settings

- [x] **`/app/settings/page.tsx`** — Added "Email Notifications" section:
  - `emailPrefs` state synced from `user` on load
  - Checkboxes for: Trade Proposed, Counter Offer Received, Trade Accepted, Trade Declined, Trade Cancelled
  - Save button with 3-second "Saved ✓" confirmation state
  - Calls `PATCH /api/users/me` then `loadUser()` to refresh auth store

### Frontend — `types/index.ts`

- [x] Added 5 email notification boolean fields to `User` interface

### Frontend — Browse Cards Page (`/cards`)

- [x] **Full rewrite of `cards/page.tsx`** with:
  - New compact card style matching marketplace aesthetic (dark gradient, rarity color badges, card image with shimmer hover)
  - `getRarityColor()` helper for animated rarity gradients
  - **4-per-row grid** (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`)
  - **Available Traders sticky sidebar** — right panel shows traders for the selected card; hidden/replaced in select mode
  - **+ button** on card hover (top-right) — opens `CardDetailModal` for single-card add to collection/wants
  - **Mass selection mode** — toolbar "Select multiple" button, card checkbox overlay, "Select all" / "Clear" / "Exit" controls
  - **Floating action bar** replaced by action buttons inside the sidebar (see below)
  - **`CardItem`** component: `isSelectMode`, `isChecked`, `isSelected` props; checkbox overlay in select mode; blue dot when trader-panel selected

- [x] **`BulkAddModal`** component:
  - Accepts `mode: "collection" | "wants"` prop
  - Collection mode: condition, foil, 1st edition, available-for-trade fields
  - Wants mode: max acceptable condition + priority (High/Medium/Low) fields
  - Sequential `for` loop (not `Promise.all`) for accurate per-card progress bar
  - Auto-closes + exits select mode after 1.5s on full success

- [x] **Sidebar action buttons** — when in select mode with cards checked, the bottom of the Available Traders sidebar shows:
  - Count badge
  - "Add to Collection" (blue) → opens `BulkAddModal` in collection mode
  - "Add to Want List" (pink) → opens `BulkAddModal` in wants mode

- [x] **`MultiCardTradersPanel`** component (shown when in select mode):
  - Uses `useQueries` from React Query for parallel holder fetches across all selected cards
  - **Card filter** dropdown — focus on one specific card from the selection
  - **Condition filter** dropdown — filter holders by their copy's condition
  - Each selected card gets a sticky section header (thumbnail, name, set code, trader count)
  - Compact trader rows with condition badge, foil/1st edition tags, price, Trade button
  - Placeholder shown if no cards are selected yet

### Frontend — Trade Proposal Modal

- [x] **`TradeProposalModal.tsx`** — Replaced confusing "Remaining difference" with directional **Trade Balance**:
  - `netValue = theirTotal - (myTotal + cashAddNumber)` — signed, directional
  - Even trade (within $0.50): `— Even trade` in green
  - In your favor: `↑ +$X in your favor` in blue + hint "You're receiving more value — they may counter or decline"
  - In their favor: `↓ +$X in their favor` in amber + hint "You're offering more value — a generous trade for them"
  - Collapsed "You're offering / You're receiving" two-line summary (cash folded into offering line)

### Following System — Full Fix

- [x] **Backend** — Added `optionalAuthenticate` to `GET /api/users/:username` and `GET /api/users/:username/collection` routes so JWT is decoded when present without blocking unauthenticated visitors. This fixes `isFollowing` always being `false`.
- [x] **Backend** — `getPublicProfile` now checks `isBlocked` via `prisma.userBlock.findUnique` in parallel with `isFollowing`, and includes it in the response
- [x] **`types/index.ts`** — Added `isBlocked?: boolean` to `User` interface
- [x] **`usersApi`** — Added `block()`, `unblock()`, `report()` methods and `ReportPayload` interface
- [x] **Profile page** — Replaced single follow button with:
  - Follow/Unfollow button (hidden when user is blocked)
  - "⋮" dropdown with **Block/Unblock** (orange/green) and **Report** (red)
  - "You've blocked this user" badge shown when blocked
  - **Report modal** with reason dropdown (6 options) + optional details textarea + success state

### Admin Reports Tab

- [x] **Trade message email notification** — when a user sends a trade chat message, the other party receives an email with a preview of the message and a "Reply in Trade" button. Added `emailOnTradeMessage` boolean field to schema (`prisma db push`), `selectSafeUser`, `updateProfileSchema`, `authController` select, `IEmailService`, `EmailService`, `messageController` (fire-and-forget). Frontend: added field to `User` type, settings page state/init/checkbox. (2026-04-22)
- [x] **Admin report email** — when a user is reported, all admins receive a red-header email with reporter username, reported username, reason, and optional details, plus a "Review Report" button linking to `/admin/reports`. Fire-and-forget: queries `user` table for `isAdmin: true`, sends to each. Added `sendUserReportEmail` to `IEmailService` and `EmailService`. Wired into `reportUser` controller.
- [x] **`/admin/reports/page.tsx`** (new page) — Reports dashboard for admins:
  - Fetches `GET /api/admin/reports` (backend already existed)
  - Shows reported user, reporter (with avatars), reason badge, optional details, date
  - "Resolve" button calls `PATCH /api/admin/reports/:id/resolve`; optimistically marks row resolved in UI
  - "Show resolved" toggle to include/hide resolved reports
  - Pending count shown in header subtitle
  - Pagination
- [x] **`lib/api/support.ts`** — Added `AdminReport` interface, `getAdminReports()`, and `resolveReport()` API methods
- [x] **`Navbar.tsx`** — Added "Reports" link (flag icon) to admin nav, both desktop and mobile

### Bug Fixes

- [x] **Matches page 404 on "Propose Trade"** — `MatchCard` was linking to `/trade/propose?receiverId=...` (non-existent route). Fixed by replacing the `<Link>` with a `TradeProposalModal` trigger. Added `proposalTarget` state and rendered the modal at page level. Used `as unknown as User` cast since `TradeMatch` has all required fields (`id`, `username`, `avatarUrl`).

---

## Session — 2026-04-22 (Stripe Checkout Integration)

### Stripe Schema Changes
- [x] **`prisma/schema.prisma`** — Replaced single `stripePaymentIntentId` / `stripeCheckoutSessionId` with four fields on `Trade`:
  `stripeProposerSessionId`, `stripeReceiverSessionId`, `stripeProposerIntentId`, `stripeReceiverIntentId` — `prisma db push` applied

### Backend — Two-Session Checkout Model
- [x] **`StripeService.ts`** — `createCheckoutSession` updated: `destinationAccountId` is `string | null`; when null (fee-only), skips `application_fee_amount` + `transfer_data`; added `retrieveCheckoutSession(sessionId)` method
- [x] **`IStripeService.ts`** — Added `retrieveCheckoutSession` to interface
- [x] **`TradeService.acceptTrade`** — Always creates two Checkout Sessions at acceptance (one per party, regardless of cash component). Fee = 2.5% of total receive value (cards + any cash received). Proposer's session sends transfer to receiver only when proposer is cash payer; vice versa for receiver's session. Both parties need `stripeCustomerId`; cash recipient needs `stripeAccountId`. Renamed post-accept re-declarations to `acceptor` to avoid variable name conflict.
- [x] **`TradeService.submitTrackingNumber`** — Gated behind `stripeProposerIntentId && stripeReceiverIntentId`: both parties must complete payment before shipping is unlocked
- [x] **`stripeController.ts`** — `checkout.session.completed` webhook: matches session ID to `stripeProposerSessionId` / `stripeReceiverSessionId` and saves correct `paymentIntentId`; added `getCheckoutUrl` endpoint to return hosted Stripe URL for the requesting party
- [x] **`tradeController.ts`** — Added `StripeService` instance; `getCheckoutUrl` handler
- [x] **`tradeRoutes.ts`** — Added `GET /:tradeId/checkout-url` route

### Backend — Fix: `/auth/me` Missing Stripe Fields
- [x] **`authController.ts`** — Added `stripeCustomerId: true` and `stripeAccountId: true` to the Prisma select in `GET /api/auth/me`; previously these were missing, causing the frontend to never see these values after `loadUser()`

### Frontend — Stripe Types
- [x] **`types/index.ts`** — Updated `Trade` interface with `stripeProposerSessionId`, `stripeReceiverSessionId`, `stripeProposerIntentId`, `stripeReceiverIntentId`; added `stripeCustomerId: string | null` and `stripeAccountId: string | null` to `User` interface

### Frontend — Trade Detail Page Stripe UI
- [x] **`trades/[tradeId]/page.tsx`** — Per-party payment section for ACCEPTED status: each party sees their own "Complete My Payment" button showing their fee; green "Your payment complete" badge once intent is set; other party's payment status shown. Shipping section gated until both intents set. `?payment=success/cancelled` query param detection. All `alert()` calls replaced with dismissible in-app error banners (red, styled dark theme). Added `handleCompletePayment`, `isLoadingCheckout`, `actionError`, `paymentBanner` state.
- [x] **`lib/api/trades.ts`** — Added `getCheckoutUrl()` method

### Frontend — Settings Payments Page
- [x] **`settings/page.tsx`** — Full Payments section with: **Payment Method** card (Stripe customer setup, badge shows active when `stripeCustomerId` set, button hidden once set up); **Bank Payout via Stripe** card (renamed from "Payout Account" to clarify it's Stripe, not PayPal; describes bank deposit flow; badge shows connected/verification-pending/not-connected). `handleSetupCustomer` and `handleSetupConnect` with loading states, in-app error/success banners. Detects `?setup=success` query param on return from Stripe onboarding.

### Bug Fixes
- [x] **Duplicate `iCashPayer` compile error** — `trades/[tradeId]/page.tsx` had two `const iCashPayer` declarations in the same IIFE scope. Fixed by removing the duplicate.
- [x] **Settings Payments button did nothing** — Root cause: `stripeCustomerId` was missing from both `/auth/me` response and frontend `User` type. After `handleSetupCustomer` ran, `loadUser()` fetched a user object without `stripeCustomerId`, so the badge never updated to "active." Fixed by adding the field to both the backend select and the frontend type. Also hid the setup button once `stripeCustomerId` is set to prevent confusing re-clicks.

---

---

## Session — 2026-05-06 (Bug Fixes, Free Shipping, Duplicate Detection, Analytics)

### Bug Fixes

- [x] **Remove card from collection failing silently** — FK constraint violations: `TradeMatchItem`, `CardVerification`, `TradeItem`, and `CardOwnershipHistory` all reference `UserCollection` without cascade deletes. Fixed `CollectionRepository.delete` to use `prisma.$transaction` that deletes all dependent rows before deleting the collection item.
  - Files: `holo-swaps-service/src/repositories/implementations/CollectionRepository.ts`

- [x] **Card staying locked after trade cancel/decline** — two root causes: (1) React Query `staleTime: 1 minute` serving stale IN_TRADE status from cache; (2) `unlockCards` setting all cards to AVAILABLE regardless of original status. Fixed by calling `queryClient.invalidateQueries({ queryKey: ["myCollection"] })` in `confirmCancel` and `confirmDecline`, and adding `status: IN_TRADE` filter to `unlockCards` with a second pass to clear stale `lockedByTradeId`.
  - Files: `holo-swaps-ui/src/app/trades/[tradeId]/page.tsx`, `holo-swaps-service/src/services/implementations/TradeService.ts`

- [x] **Delete confirmation panel not visible** — confirm panel was rendered at top of scrollable body; user couldn't see it when scrolled down. Moved to sticky footer area so it's always visible.
  - Files: `holo-swaps-ui/src/app/collection/page.tsx`

- [x] **Mouse lag in Chrome on collection page** — `backdrop-blur-sm` on every card in the grid caused one GPU compositor layer per card. Removed from all card elements; changed to `bg-slate-900 will-change-transform`.
  - Files: `holo-swaps-ui/src/app/collection/page.tsx`

- [x] **Lag when opening edit card modal** — `backdrop-blur-sm` on full-screen overlay caused frame drop on open. Removed from all `fixed inset-0 bg-black/80` overlays.
  - Files: `holo-swaps-ui/src/app/collection/page.tsx`

- [x] **Duplicate card detection** — adding a card with identical (userId, cardId, condition, isFoil, isFirstEdition, language) created a duplicate row. Fixed: `addToCollection` now runs a `findFirst` check before creating; if a match exists, increments quantity (capped at 99) and returns updated item with 200.
  - Files: `holo-swaps-service/src/controllers/collectionController.ts`

### New Features

- [x] **Last-photo warning modal** — deleting the last photo from an AVAILABLE (listed) card now shows a warning modal. If confirmed, the photo is deleted and the card is delisted (`isOpenListing: false`, status set to UNAVAILABLE). Cancel aborts the delete.
  - State: `confirmLastPhotoMediaId`; functions: `doDeletePhoto`, `handleConfirmLastPhotoDelete`, `handleCancelLastPhotoDelete`
  - Files: `holo-swaps-ui/src/app/collection/page.tsx`

- [x] **Free shipping for whitelisted users** — admin-controlled flag waives the return shipping fee at trade acceptance.
  - Schema: `freeShipping Boolean @default(false)` on `User` model; `prisma db push` applied
  - Backend: `TradeService.acceptTrade` checks `(proposer|receiver).freeShipping`; sets `shippingCents: 0` when true
  - Admin route: `PATCH /api/admin/users/:userId/free-shipping` — toggles the flag, returns updated user
  - Files: `holo-swaps-service/prisma/schema.prisma`, `holo-swaps-service/src/services/implementations/TradeService.ts`, `holo-swaps-service/src/routes/adminRoutes.ts`

- [x] **Admin API reference doc** — `scripts/admin-api.md` with curl examples for all admin-only operations: login, find user by username, toggle free shipping, ban/unban user, force-set trade status, complete trade.
  - Files: `holo-swaps/scripts/admin-api.md`

### Google Analytics — Full Event Tracking

Added comprehensive GA4 event tracking across the entire app. TypeScript global type declaration added at `holo-swaps-ui/src/types/globals.d.ts` (declares `window.gtag?` so all calls are type-safe). All events use `window.gtag?.("event", ...)` with optional chaining (safe when GA not loaded).

| Event | File | Trigger |
|---|---|---|
| `sign_up` | `auth/register/page.tsx` | Successful registration |
| `email_verified` | `verify-email/page.tsx` | Email verification success |
| `payment_method_added` | `settings/page.tsx` | Stripe customer setup complete |
| `card_added_to_collection` | `collection/page.tsx` (AddCardDialog) | Card added |
| `first_card_added` | `collection/page.tsx` (AddCardDialog) | First-ever card (collectionCount === 0) |
| `first_photo_uploaded` | `collection/page.tsx` (EditCardDialog) | First photo on any card |
| `card_listed_for_trade` | `collection/page.tsx` (EditCardDialog) | Card set to AVAILABLE |
| `card_added_to_wantlist` | `collection/page.tsx` (AddWantDialog) | Want added |
| `trade_proposed` | `TradeProposalModal.tsx` | Trade proposal submitted |
| `trade_countered` | `CounterOfferModal.tsx` | Counter offer sent |
| `trade_viewed` | `trades/[tradeId]/page.tsx` | Trade detail initial load |
| `trade_accepted` | `trades/[tradeId]/page.tsx` | Trade accepted |
| `trade_declined` | `trades/[tradeId]/page.tsx` | Trade declined |
| `trade_cancelled` | `trades/[tradeId]/page.tsx` | Trade cancelled |
| `checkout_started` | `trades/[tradeId]/page.tsx` | "Complete My Payment" clicked |
| `checkout_completed` | `trades/[tradeId]/page.tsx` | Return with `?payment=success` |
| `listing_viewed` | `listings/page.tsx` | Listing detail modal opened |
| `profile_viewed` | `profile/[username]/page.tsx` | Non-own profile loaded |
| `match_viewed` | `matches/page.tsx` | Matches page mounted |

---

## Bug Fixes & Issues Resolved

### CORS Error
- ✅ Fixed: Updated `FRONTEND_URL` from port 3000 to 3001 in backend `.env`

### Dark Mode Not Showing
- ✅ Fixed: Added `className="dark"` to `<html>` and `<body>` tags in `layout.tsx`

### Missing npm Package
- ✅ Fixed: Removed non-existent `@radix-ui/react-badge` from dependencies

### Prisma `omit` Error
- ✅ Fixed: Replaced `omit` with `select` in `UserRepository.ts` (omit requires Client Extensions)
- ✅ Fixed (2026-04-22): Exported `selectSafeUser` from `UserRepository.ts` and replaced all remaining `omit: { passwordHash: true }` usages across the codebase with `select: selectSafeUser`. Files fixed: `TradeRepository.ts`, `adminRoutes.ts`, `disputeController.ts`, `messageController.ts`, `reviewController.ts`, `userController.ts`. Root cause of trade proposal error.

### Frontend Dependencies Not Installed
- ✅ Fixed: Ran `npm install` in `holo-swaps-ui` directory

---
