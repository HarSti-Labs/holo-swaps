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
- [x] `UserCollection` — per-user card inventory with condition, grading, status, media
- [x] `UserWant` — want list with priority, condition preference, grading preference
- [x] `Trade` — full trade model with value snapshots, cash difference, Stripe payment intent
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
- [x] `PATCH  /api/trades/:id/cancel` — cancel at PROPOSED/COUNTERED/ACCEPTED; refunds Stripe if needed
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
- [x] `PATCH  /api/collection/:itemId` — update item; blocked while `IN_TRADE`
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
- Nodemailer for emails (console logging for now)

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

### Authentication
- [x] `/auth/login` - Login page with vibrant gradient styling
- [x] `/auth/register` - Registration page with real-time username/email availability checking
- [x] Username validation with 500ms debouncing
- [x] Email validation with 500ms debouncing
- [x] Visual feedback (spinner, checkmark, X icons)
- [x] Auth API client (`/lib/api/auth.ts`)
  - [x] `register()`
  - [x] `login()`
  - [x] `me()`
  - [x] `checkUsername()`
  - [x] `checkEmail()`
  - [x] `resendVerificationEmail()`

### Email Verification ✅
- [x] Backend: `POST /api/auth/resend-verification` endpoint
- [x] Backend: `AuthService.resendVerificationEmail()` method
- [x] Frontend: `EmailVerificationBanner` component
- [x] Frontend: Banner displays on dashboard if `!user.isEmailVerified`
- [x] Frontend: "Resend Email" button with loading state
- [x] ⚠️ Note: Emails log to console (need Resend account for production)

### Card Browsing
- [x] `/cards` - Card browsing page with search and pagination
- [x] Grid layout with hover effects and holographic card styling
- [x] Search functionality with debouncing
- [x] Pagination controls
- [x] Gradient animated header with pulsing orbs
- [x] Cards API client (`/lib/api/cards.ts`)
  - [x] `searchCards()`

### Collection Management
- [x] `/collection` - User collection page
- [x] Grid/list view toggle
- [x] AddCardDialog component with two-step process:
  - [x] Step 1: Search for card
  - [x] Step 2: Set condition, foil, quantity
- [x] Condition selector (MINT, NEAR_MINT, LIGHTLY_PLAYED, etc.)
- [x] Foil checkbox
- [x] Empty state with friendly UI
- [x] Collection API client (`/lib/api/collection.ts`)

### Dashboard
- [x] `/dashboard` - Main dashboard page
- [x] Welcome message with username
- [x] Stats cards (Total Trades, Active Trades, Completed, Reputation)
- [x] Recent trades section with TradeCard component
- [x] Quick actions sidebar
- [x] Email verification banner integration

### Navigation
- [x] Navbar component with authenticated/unauthenticated states
- [x] Links: Dashboard, My Collection, My Trades, Matches
- [x] Logout functionality
- [x] Vibrant gradient styling matching overall theme

### UI Components
- [x] Input component (Tailwind-styled)
- [x] Button component
- [x] Card component
- [x] TradeCard component
- [x] EmailVerificationBanner component

### Database Seeding
- [x] CSV import script (`seedCardsFromCSV.ts`)
- [x] Successfully seeded 563 Pokémon cards from 8 sets
- [x] Cleanup script (`cleanupSeedData.ts`)

### API Integration
- [x] TCGAPIs integration (replaced TCGplayer)
- [x] CORS configuration fixed (frontend port 3001)
- [x] Environment variables configured

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

### Frontend Dependencies Not Installed
- ✅ Fixed: Ran `npm install` in `holo-swaps-ui` directory

---
