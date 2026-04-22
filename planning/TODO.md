# Holo Swaps — TODO

Ordered by priority for a shippable product. Update this file as items are completed.

---

## In Progress

_(move items here when actively working on them)_

---

## Up Next

### 2. Collection Visibility Setting UI
- Settings page needs a dropdown to change `collectionVisibility` (PUBLIC / PRIVATE / FOLLOWERS_ONLY)
- Backend `PATCH /api/users/me` already accepts it
- The backend `GET /:username/collection` already enforces it but the FOLLOWERS_ONLY branch has a TODO (needs follower check wired in)
- Files: `holo-swaps-ui/src/app/settings/page.tsx`, `holo-swaps-service/src/controllers/userController.ts`


### 4. Post-Trade Review Prompt
- Backend: `POST /api/trades/:tradeId/reviews` exists
- `GET /api/users/:username/reviews` exists but profile page shows "No reviews yet" placeholder
- Need: review modal shown on trade detail page when status = COMPLETED and user hasn't reviewed yet
- Need: profile Stats tab to actually render reviews from the API
- Files: `holo-swaps-ui/src/app/trades/[tradeId]/page.tsx`, `holo-swaps-ui/src/app/profile/[username]/page.tsx`

---

## Phase 2 (Post-Launch)

- **Google Sign-In** — free, ~2-3 hours, high conversion impact
- **Two-Factor Authentication** — TOTP (Google Authenticator/Authy), required for high-value trades
- **Graded Cards UI** — PSA/BGS/CGC/SGC fields exist in schema, no add-to-collection UI yet
- **Card Photo Uploads** — `POST /api/upload` exists, no UI in collection for photo upload
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

- [x] Following system — fixed `isFollowing` bug (added `optionalAuthenticate` to profile route), added `isBlocked` to profile response, added Block/Unblock + Report UI with dropdown and report modal (2026-04-22)
- [x] Admin Reports tab — `/admin/reports` page with resolve action; Reports link added to navbar (2026-04-22)

_(see `planning/COMPLETED.md` for full history)_
