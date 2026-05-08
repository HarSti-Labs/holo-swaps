# Holo Swaps — TODO

Ordered by priority for a shippable product. Update this file as items are completed.

---

## In Progress

_(move items here when actively working on them)_

---

## Pre-Launch (do before sharing the app publicly)

### 1. Favicon + OG Tags
- Blank browser tab — add favicon (H logo `.ico`) to `/holo-swaps-ui/src/app/`
- Add `apple-touch-icon` for iOS home screen
- Add `og:image`, `og:title`, `og:type` to root `layout.tsx` metadata so Discord/Twitter/iMessage links show a preview
- Test with opengraph.xyz after deploying

### 2. Admin Dispute Resolution UI ✅ DONE
- `dispute` added to `tradeInclude` — returned on every trade fetch
- Admin trade detail: when DISPUTED, shows dispute info + "Resolve Dispute" button
- Outcome dropdown (for proposer / for receiver / mutual / closed) + resolution notes
- Calls `PATCH /api/disputes/:id/resolve`

### 3. Avatar in Navbar
- Navbar shows user initials only, even when the user has an avatar photo set
- Fix: render `<img>` when `user.avatarUrl` exists, same pattern used elsewhere in the app

### 4. Sitemap + robots.txt
- Add `sitemap.xml` (static pages: `/`, `/listings`, `/cards`, `/how-it-works`, `/faq`, etc.)
- Add `robots.txt` allowing all crawlers
- Both needed before submitting to Google Search Console

### 5. Google Search Console
- Verify domain at search.google.com/search-console
- Link to Google Analytics property
- Submit sitemap

---

## Up Next (Post-Launch)

### Price Alerts UI
- Backend fully built: `priceAlertRoutes.ts`, create/list/delete alerts per user
- Zero frontend — users have no way to set a price alert from the app
- Add to collection item detail or card detail modal: "Alert me when price drops below $X"

### Google Sign-In
- Free, ~2-3 hours, high conversion impact
- See `FEATURES.md` for full implementation spec
- Recommended before heavy marketing push

---

## Phase 2 (After First Real Users)

- **Two-Factor Authentication** — TOTP (Google Authenticator/Authy), required for high-value trades
- **Graded Cards UI** — PSA/BGS/CGC/SGC fields exist in schema, no add-to-collection UI yet
- **Set Completion Tracker** — needs `CardSet` table + completion % UI on profile
- **Achievements/Badges** — schema doesn't exist yet, design needed
- **Quiet Hours for Notifications** — user preference to pause notifications between X–Y time
- **Activity Feed** — following-based feed of listings, trades, and set completions

## Phase 3/4 (Future)

- **Mobile App** — React Native + Expo (same backend, `DeviceToken` table already exists)
- **Push Notifications** — Expo/APNs/FCM, wired through `DeviceToken`
- **Phone Auth** — Twilio SMS (~$50-200/month), Phase 3
- **Apple Sign-In** — required for iOS App Store if Google login exists
- **Trading Groups** — group feed, member list, group-only card visibility

---

## Completed ✓

- [x] Following system — fixed `isFollowing` bug, added Block/Unblock + Report UI (2026-04-22)
- [x] Admin Reports tab — `/admin/reports` page with resolve action (2026-04-22)
- [x] Post-trade review prompt — yellow banner, star rating, review list, GA event (2026-05-07)
- [x] Free shipping — wired `freeShipping` field end-to-end; "Free" shown in green on trade page and proposal modal; Stripe skips shipping line item when 0 (2026-05-07)
- [x] GA analytics — 19 GA4 events instrumented across the app (2026-05-07)
- [x] Dispute opening UI — "Open Dispute" button + modal on trade detail page; `dispute_opened` GA event (2026-05-07)
- [x] Collection visibility setting — dropdown in settings (PUBLIC / FOLLOWERS_ONLY / PRIVATE); FOLLOWERS_ONLY follower check wired in backend (2026-05-07)
- [x] Admin disputes page — `/admin/disputes` with filter tabs, evidence count, links to trade detail (2026-05-07)
- [x] Notification bell — navbar bell icon with unread badge, dropdown, mark-all-read, 30s polling (2026-05-07)
- [x] Admin dispute resolution — resolve form on trade detail page, outcome dropdown, notes, calls PATCH /api/disputes/:id/resolve (2026-05-07)

_(see `planning/COMPLETED.md` for full history)_
