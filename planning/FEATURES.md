# Holo Swaps — Feature Specs

## Mobile App

### Same Backend
The React Native mobile app uses the exact same Express API as the web app. No separate backend needed.

### Push Notifications
- On mobile app launch, register device with Expo and get a push token
- Store token in `DeviceToken` table (linked to user, tagged with platform IOS/ANDROID)
- When a `Notification` record is created, also send push via Expo Push API to all active device tokens for that user
- On logout, delete the device token for that device
- Multiple devices supported per user (phone + tablet)

### Auth — Refresh Tokens
- Web: JWT stored in httpOnly cookie, short expiry (15min–1hr)
- Mobile: JWT stored in Expo SecureStore, paired with a long-lived `RefreshToken`
- Refresh token flow: when JWT expires, app silently exchanges refresh token for a new JWT
- Refresh tokens stored in DB so they can be revoked ("log out all devices")
- `revokedAt` set on logout — token rejected even if not expired
- `deviceInfo` stored so users can see and revoke specific devices from settings

### File Uploads from Mobile
- Card photos taken from device camera upload directly to Supabase Storage using the Supabase JS client
- Same storage bucket and URLs as web — no backend middleman needed
- Supabase Storage policies restrict uploads to authenticated users only

### Rate Limiting
- All API requests include `X-Client-Type: web | mobile` header
- Mobile clients may have higher limits on read endpoints (collection browsing, card search)
- Write endpoints (propose trade, submit offer) share the same strict limits across both

---

## Auth & Security

### Password Reset
- "Forgot password" generates a short-lived token (15 min)
- Token stored in DB and invalidated after use
- Email sent with reset link containing token

### Two-Factor Authentication (Phase 2)
- TOTP-based (Google Authenticator, Authy)
- Required for accounts that have completed high-value trades (e.g. >$200)
- Recovery codes generated on setup

### Alternative Sign-In Methods (Enhancement - Future)

#### Google Sign-In (Recommended First)
**Why:** Free, trusted, easy UX, 20-40% higher conversion rates

**Implementation:**
1. **Backend Setup:**
   - Install: `passport` + `passport-google-oauth20` OR use Supabase Auth
   - Create Google OAuth app at [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google+ API
   - Get Client ID & Secret
   - Add redirect URIs: `http://localhost:4000/api/auth/google/callback` (dev) and production URL

2. **Database Changes:**
   ```sql
   ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
   ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'; -- 'local', 'google', 'phone'
   ALTER TABLE users ALTER COLUMN password DROP NOT NULL; -- Allow null for OAuth users
   ```

3. **New API Routes:**
   - `GET /api/auth/google` - Redirects to Google OAuth consent screen
   - `GET /api/auth/google/callback` - Handles OAuth callback, creates/finds user, issues JWT
   - Logic: Check if `google_id` exists → login existing user OR create new user with Google profile data

4. **Frontend Changes:**
   - Add "Sign in with Google" button on login/register pages
   - Button redirects to: `GET /api/auth/google`
   - Callback page extracts token from URL params, saves to localStorage, redirects to dashboard

5. **User Flow:**
   - User clicks "Sign in with Google"
   - Google consent screen → user approves
   - Redirected back with Google profile (email, name, ID)
   - Backend creates user if new OR logs in existing user
   - JWT token issued → frontend saves → user logged in

**Estimated Time:** 2-3 hours
**Cost:** FREE
**Dependencies:** `passport`, `passport-google-oauth20`

---

#### Phone Number Auth (More Complex - Mobile Priority)
**Why:** Great for mobile apps, lower friction than passwords

**Caution:** Costs ~$0.0075 per SMS ($50-200/month depending on volume)

**Implementation:**
1. **Backend Setup:**
   - Install: `twilio` OR `firebase-admin` OR use Supabase Auth
   - Sign up for Twilio account
   - Get Account SID, Auth Token, buy phone number ($1/month)

2. **Database Changes:**
   ```sql
   ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) UNIQUE;
   ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;

   CREATE TABLE verification_codes (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     phone_number VARCHAR(20) NOT NULL,
     code VARCHAR(6) NOT NULL,
     expires_at TIMESTAMP NOT NULL,
     attempts INT DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_verification_phone ON verification_codes(phone_number);
   ```

3. **New API Routes:**
   - `POST /api/auth/phone/send-code` - Sends 6-digit SMS code
     - Body: `{ phoneNumber: "+15551234567" }`
     - Generates random 6-digit code
     - Stores in `verification_codes` with 5-min expiry
     - Sends SMS via Twilio
   - `POST /api/auth/phone/verify-code` - Verifies code and logs in
     - Body: `{ phoneNumber: "+15551234567", code: "123456" }`
     - Checks if code matches and not expired
     - Creates user if new OR logs in existing
     - Issues JWT token

4. **Frontend Changes:**
   - Phone input field with country code selector (use `react-phone-number-input`)
   - Two-step flow:
     1. Enter phone number → sends code
     2. Enter 6-digit code → logs in
   - Add resend code button (with cooldown timer)

5. **Security Considerations:**
   - Rate limit: Max 3 SMS per phone per hour
   - Rate limit: Max 5 verification attempts per code
   - Invalidate code after successful use
   - Clean up expired codes daily

6. **User Flow:**
   - User enters phone number
   - Receives SMS with 6-digit code
   - Enters code within 5 minutes
   - Logged in OR account created

**Estimated Time:** 4-6 hours
**Cost:** ~$0.0075 per SMS (~$50-200/month)
**Dependencies:** `twilio` (or alternative SMS provider)

---

#### Apple Sign-In (iOS Requirement if using Google/Facebook)
**Note:** If you add Google/Facebook sign-in to iOS app, Apple REQUIRES Apple Sign-In as an option

**Implementation:** Similar to Google OAuth but uses Apple's auth flow
**Cost:** FREE
**Required for:** iOS App Store approval (if other social login exists)

---

#### Recommendation Priority:
1. ✅ **Email/Password** (Current - keep this)
2. 🟡 **Google Sign-In** (Phase 2 - high ROI, free, easy)
3. 🟡 **Phone Auth** (Phase 3 - if mobile app, costs money)
4. 🟡 **Apple Sign-In** (Phase 3 - required for iOS if Google/FB exists)

---

## Collection & Cards

### Collection Visibility
- PUBLIC — anyone can browse your collection
- PRIVATE — only you can see it
- FOLLOWERS_ONLY — only users you approve can see it
- Set per-collection or as a global default on your profile

### Card Media Requirements
- Minimum: front photo + back photo before a card can be marked AVAILABLE
- Optional: detail shots (holo, signature, damage) and video
- On trade acceptance: both parties must re-upload front + back to CardVerification
- Admin reviews verification media before marking trade VERIFIED

### Graded Cards
- Supported companies: PSA, BGS, CGC, SGC
- Fields: gradingScore (e.g. 9.5), gradingCertNumber
- Cert number can be cross-referenced with grading company websites
- Want list supports grading preference (e.g. "PSA 9 or better only")

### Set Completion Tracker
- CardSet table stores official set data (name, code, total cards, game, release date)
- User's collection is compared against CardSet to show completion %
- "Cards I'm missing" view filters want list against a specific set
- Notification when you complete a set

---

## Trading

### Trade Mechanics (How It Works)

**Many-to-Many Trading:**
- Trades support any number of cards on each side (not limited to 1-for-1)
- Examples: 3 commons for 1 rare, 1 card + $20 cash for 2 cards, 5 for 5

**Value Calculation:**
- Market prices fetched from TCGAPIs at proposal time
- Prices stored as `proposerMarketValue` and `receiverMarketValue`
- `valueDifference = receiverMarketValue - proposerMarketValue`
- Shown for reference only - does NOT force cash payment

**Cash on Top (Optional):**
- `cashDifference > 0` → proposer pays receiver
- `cashDifference < 0` → receiver pays proposer
- `cashDifference = 0` → straight card swap (no money moves)
- Both parties can add cash, net is what actually transfers

**Price Refresh:**
- While `PROPOSED` or `COUNTERED`: prices refresh on view
- Capped at 3 refreshes via `priceRefreshCount` to prevent gaming
- On `ACCEPTED`: prices lock permanently (`priceLockedAt`)

**Card Locking:**
- All cards in a trade get `status = IN_TRADE` and `lockedByTradeId`
- Locked cards cannot be edited, deleted, or added to another trade
- Unlocked on completion/cancellation

**Trade Lifecycle:**
```
PROPOSED → COUNTERED → ACCEPTED → BOTH_SHIPPED →
A_RECEIVED → B_RECEIVED → BOTH_RECEIVED → VERIFIED → COMPLETED
```

**Ownership Transfer (on COMPLETED):**
- `UserCollection.userId` updated to new owner
- `CardOwnershipHistory` record created (full provenance)
- Cards unlocked and set to `AVAILABLE` for new owner
- `tradeCount` incremented for both users

---

### Open Listings
- A user marks a card as open to offers (separate from direct trade proposals)
- Any user can browse open listings and make a DirectOffer
- DirectOffer is simpler: "I'll give you [my card(s)] for this"
- Owner can accept, decline, or counter a DirectOffer
- Accepted DirectOffer automatically creates a full Trade

### Direct Offer
- Triggered when browsing another user's collection
- Offer specifies which of your cards you'd give in exchange
- Owner notified immediately
- If accepted, converts to a Trade in ACCEPTED status

### Trade Matching
- Background job runs periodically (e.g. every hour)
- For every UserWant, find UserCollection items that satisfy it (condition, grading, game)
- For each potential match pair, check if the reverse is also true (mutual want)
- Create TradeMatch record with matchScore
- matchScore formula: 1 - (abs(valueA - valueB) / max(valueA, valueB)) — closer to 1 = better
- Both users get a TRADE_MATCH notification
- Match UI shows:
  - "You have: [card] worth ~$X"
  - "They have: [card] worth ~$Y"
  - "Value difference: $Z — propose with $Z cash on top?"
  - [Propose Trade] button pre-fills the trade

### Trade Expiry
- Trades in PROPOSED or COUNTERED auto-cancel after 7 days (configurable)
- 24-hour warning notification sent before expiry
- Cards unlocked when trade expires

---

## User Tiers

Tiers are calculated from tradeCount + reputationScore combined.

| Tier     | Requirement                        | Perks                              |
|----------|------------------------------------|------------------------------------|
| Bronze   | 0–4 trades                         | Basic access                       |
| Silver   | 5–24 trades, rep ≥ 3.5             | Priority in match suggestions      |
| Gold     | 25–99 trades, rep ≥ 4.0            | Reduced dispute hold time          |
| Diamond  | 100+ trades, rep ≥ 4.5             | Verified badge, featured listings  |

---

## Achievements

| Badge             | Trigger                                          |
|-------------------|--------------------------------------------------|
| First Trade       | Complete your first trade                        |
| On a Roll         | Complete 10 trades                               |
| Veteran Trader    | Complete 50 trades                               |
| Legend            | Complete 100 trades                              |
| 5-Star Trader     | Maintain 5.0 reputation across 10+ reviews      |
| Set Completer     | Complete 100% of any set                         |
| Collector         | Add 100+ cards to your collection               |
| Holo Hunter       | Trade 10 foil cards                             |
| Graded Guru       | Own 5+ graded cards (PSA/BGS/CGC/SGC)           |
| Early Adopter     | Joined during beta                              |
| Verified Trader   | Completed identity verification                  |

---

## Notifications

### Types
| Type                | Trigger                                              |
|---------------------|------------------------------------------------------|
| TRADE_PROPOSED      | Someone proposed a trade with you                    |
| TRADE_COUNTERED     | Your trade was countered                             |
| TRADE_ACCEPTED      | Your trade was accepted                              |
| TRADE_CANCELLED     | A trade was cancelled                                |
| TRADE_COMPLETED     | Trade completed, ownership transferred               |
| TRADE_MATCH         | Auto-matched with another user                       |
| SHIPMENT_UPDATED    | Tracking status changed                              |
| REVIEW_RECEIVED     | Someone left you a review                            |
| CARD_MATCH          | Someone listed a card on your want list              |
| PRICE_ALERT         | A card hit your target price                         |
| DISPUTE_OPENED      | A dispute was opened on your trade                   |
| DISPUTE_UPDATED     | Admin updated the status of your dispute             |

### Preferences
- Users can toggle each notification type on/off
- Separate toggles for in-app vs email vs push (mobile)
- "Quiet hours" setting — no notifications between X and Y time

---

## Disputes

### Flow
1. Either party opens a dispute → Trade status → DISPUTED
2. Both parties submit evidence (photos, videos, description) within 72 hours
3. Admin reviews evidence → status → UNDER_REVIEW
4. Admin resolves:
   - RESOLVED_FOR_PROPOSER — proposer's claims upheld
   - RESOLVED_FOR_RECEIVER — receiver's claims upheld
   - RESOLVED_MUTUAL — compromise resolution
5. Resolution notes visible to both parties
6. Reputation scores adjusted based on outcome

### Grounds for dispute
- Card condition significantly worse than listed
- Card did not arrive
- Card is counterfeit
- Wrong card received
- Cash payment not received

---

## Social

### Following
- Follow a user to see their new listings in your activity feed
- Followed users' collections visible even if FOLLOWERS_ONLY
- Follower/following count shown on profile

### Activity Feed
- New cards listed by people you follow
- Completed trades (public)
- Set completions
- Achievement unlocks

### Trading Groups (Phase 4)
- Create or join a group (e.g. "Vintage Base Set Collectors")
- Group has its own feed, member list, and trade activity
- Cards can be listed within a group for group-only visibility

---

## 🚀 Next Priority Features (Roadmap)

### Option 2: Trade Proposal Flow (HIGH PRIORITY - Core Feature)
**Goal:** Enable users to propose trades with each other

**Backend Implementation:**
1. **Browse Other Users' Collections**
   - Add endpoint: `GET /api/users/:username/collection`
   - Query params: game, search, condition filters
   - Returns paginated collection items (only if visibility allows)

2. **Create Trade Proposal**
   - Endpoint: `POST /api/trades`
   - Body:
     ```json
     {
       "receiverId": "uuid",
       "proposerCardIds": ["uuid1", "uuid2"],
       "receiverCardIds": ["uuid3", "uuid4"],
       "cashDifference": 0
     }
     ```
   - Logic:
     - Lock selected cards (status → IN_TRADE)
     - Calculate market values from latest CardPriceHistory
     - Create Trade record with PROPOSED status
     - Create TradeItem records for each card
     - Send TRADE_PROPOSED notification to receiver

3. **View Proposed Trades**
   - Endpoint: `GET /api/trades` (already exists)
   - Filter by status, role (proposer/receiver)

4. **Accept/Counter/Decline Trade**
   - `PATCH /api/trades/:id/accept`
   - `POST /api/trades/:id/counter` (create TradeOffer with new terms)
   - `PATCH /api/trades/:id/cancel`

**Frontend Implementation:**
1. **User Collection Page** (`/users/:username`)
   - Grid of user's collection
   - "Propose Trade" button on each card
   - Multi-select mode to choose multiple cards

2. **Trade Builder Modal**
   - Left side: Your cards
   - Right side: Their cards
   - Market value totals for each side
   - Cash difference calculator
   - Submit proposal button

3. **Trades Page** (`/trades`)
   - Tabs: Proposed | Active | Completed
   - TradeCard component showing both sides
   - Actions: Accept, Counter, Cancel

**Time Estimate:** 3-4 hours

---

### Option 3: Trade Matching Algorithm (DIFFERENTIATOR)
**Goal:** Auto-match users with complementary wants

**Backend Implementation:**
1. **Matching Algorithm (Background Job)**
   - Create script: `src/scripts/generateTradeMatches.ts`
   - Algorithm:
     ```
     For each UserWant:
       1. Find UserCollection items matching (cardId, condition, grading)
       2. Check if owner also wants one of requester's cards
       3. Calculate matchScore based on value difference
       4. Create TradeMatch if score > threshold
     ```
   - Run via cron job (hourly)

2. **Match Endpoints**
   - `GET /api/matches` - Get user's pending matches
   - `POST /api/matches/:id/propose` - Convert match to trade proposal
   - `DELETE /api/matches/:id` - Dismiss match

**Frontend Implementation:**
1. **Matches Page** (`/matches`)
   - Card-based layout showing potential trades
   - Each card shows:
     - "You have: X"
     - "They want: X"
     - "They have: Y"
     - "You want: Y"
     - Value difference indicator
   - "Propose Trade" button (pre-fills trade builder)

2. **Match Notifications**
   - Badge on Matches nav link
   - Toast notification on new match

**Time Estimate:** 2-3 hours

---

### Option 4: User Profiles & Reviews (TRUST BUILDING)
**Goal:** Build trust through public profiles and trade reviews

**Backend Implementation:**
1. **User Profile Endpoints**
   - `GET /api/users/:username` - Public profile data
   - `PATCH /api/users/me` - Update own profile
   - Returns: username, avatar, bio, location, reputation, tradeCount, tier, reviews

2. **Review System**
   - Endpoint: `POST /api/trades/:tradeId/review`
   - Body: `{ rating: 1-5, comment: "Great trader!" }`
   - Logic:
     - Can only review completed trades
     - One review per person per trade
     - Updates reviewee's reputationScore (average of all ratings)

3. **Collection Visibility**
   - Check visibility setting before showing collection
   - PUBLIC → anyone can view
   - PRIVATE → only owner
   - FOLLOWERS_ONLY → requires follow relationship

**Frontend Implementation:**
1. **Profile Page** (`/users/:username`)
   - Avatar, username, bio, location
   - Stats: trades, reputation, tier badge
   - Tabs: Collection | Want List | Reviews
   - Follow/Unfollow button (if not self)

2. **Review Modal**
   - 5-star rating selector
   - Comment textarea
   - Submit button
   - Shows after trade is marked COMPLETED

3. **Settings Page** (`/settings`)
   - Edit profile (avatar, bio, location)
   - Collection visibility dropdown
   - Privacy settings

**Time Estimate:** 2-3 hours

---

## 📝 Implementation Notes

**When to Work on These:**
1. Option 2 (Trade Proposal) should be next - it's the core value prop
2. Option 3 (Matching) makes the app unique - do after trades work
3. Option 4 (Profiles) builds trust - needed before launch but can wait

**Dependencies:**
- Trade Proposal requires email verification to be enforced (add check in POST /api/trades)
- Matching requires enough users/data to be useful (can build now, enable later)
- Reviews require completed trades (build the UI/endpoints, will populate over time)

**Current Blockers:**
- Need Resend account to send real verification emails (sign up at resend.com)
- Need to populate database with full card dataset (use paid TCGAPIs plan)

---
