# Holo Swaps — System Flow Reference

> **Purpose:** Comprehensive technical reference documenting every system flow, edge case, and state transition in the platform. Use this when implementing features to understand exact behavior.

Every case that can happen in the platform, what triggers it, what the system does, and what each party sees.

---

## 1. Authentication

### 1a. Register
```
User submits email + username + password
  → Password hashed with bcrypt
  → User row created (isEmailVerified: false)
  → JWT issued (7-day TTL)
  → Refresh token created in DB (30-day TTL)
  → Both tokens returned to client
```
**Note:** Email is not yet verified. Trades are still allowed — email verification is a planned Phase 1 gate.

---

### 1b. Login
```
User submits email + password
  → Password compared with bcrypt hash
  → If banned → 403 Forbidden
  → JWT issued
  → New refresh token created in DB
  → lastLoginAt updated
  → deviceInfo (User-Agent) stored on refresh token
  → Returns: { token, refreshToken, user }
```

---

### 1c. Refresh Token
```
Client sends refreshToken (from prior login/refresh)
  → DB lookup: is token valid? not revoked? not expired?
  → Old token marked revokedAt = now
  → New refresh token created (rotation)
  → New JWT issued
  → Returns: { token, refreshToken }
```
If the token is revoked or expired → `401 Unauthorized`. Client must re-login.

---

### 1d. Logout
```
Client sends refreshToken
  → Token found in DB → revokedAt = now
  → Future refresh attempts with this token → 401
```
The JWT itself is not invalidated (stateless) — it expires naturally after 7 days.

---

## 2. Collection & Want List

### 2a. Add a Card to Collection
```
User submits cardId + condition + optional market value override
  → Card existence verified
  → UserCollection row created (status: AVAILABLE)
  → Card is now visible in their public collection and matchable
```

### 2b. Card Statuses
| Status | Meaning |
|---|---|
| `AVAILABLE` | Open for trade offers |
| `UNAVAILABLE` | Owner has paused trading it |
| `IN_TRADE` | Locked in an active trade — cannot be edited, deleted, or offered again |
| `TRADED_AWAY` | Ownership has transferred out — historical record only |

### 2c. Edit / Delete a Card
```
PATCH or DELETE /api/collection/:itemId
  → If status = IN_TRADE → 400 blocked
  → Otherwise: update or delete
```

### 2d. Add to Want List
```
User submits cardId + condition preference + priority
  → Unique per (userId, cardId) — duplicate want → 409
  → Want created with isFulfilled: false
  → Match engine will now surface this user when someone has that card
```

---

## 3. Trade Proposal

```
User A proposes a trade to User B
  → Validate: A ≠ B
  → Validate: all of A's cards are AVAILABLE and owned by A
  → Validate: all of B's cards are AVAILABLE and owned by B
  → TCGPlayer prices fetched for all cards → stored as proposerMarketValue / receiverMarketValue
    (for display only — they do NOT force a cash requirement)
  → cash is opt-in and independent per side:
      proposerCashAdd (>= 0) → proposer throws in this much cash
      receiverCashAdd (>= 0) → receiver throws in this much cash
      net = proposerCashAdd − receiverCashAdd
        net > 0 → proposer pays receiver the net amount
        net < 0 → receiver pays proposer the net amount
        net = 0 → straight card swap (even if both added cash that canceled out)
      omit both → pure card swap, no cash changes hands
  → cashPayerId set to net payer (or null for straight swaps)
  → expiresAt = now + 7 days
  → Prisma transaction:
      - Trade row created (status: PROPOSED)
      - All involved cards → status: IN_TRADE, lockedByTradeId = trade.id
  → Notification sent to B: "New trade offer from A"
```

**Cards are locked immediately.** Neither party can list them in another trade or edit/delete them until the trade resolves.

**Cash is always optional and either side can offer it.** Two people can agree to swap a $200 card for a $50 card straight-up — the system shows market values for reference but never blocks or forces a payment. Both parties can also both throw in cash simultaneously; the net is what actually moves.

---

## 4. Counter Offer

```
B (or A) sends a counter offer
  → Trade must be PROPOSED or COUNTERED
  → Either party can set proposerCashAdd and/or receiverCashAdd
  → Net cash = proposerCashAdd − receiverCashAdd
  → Prisma transaction:
      - TradeOffer row created (stores the signed net + message for history)
      - Trade.cashDifference updated to Math.abs(net)
      - Trade.cashPayerId updated to the new net payer
      - Trade.status → COUNTERED
  → Notification sent to the other party: "Counter offer received"
```

Parties can go back and forth indefinitely. Each counter fully replaces the previous cash terms on the Trade row, so `acceptTrade` always acts on the most recently agreed amounts.

---

## 5. Accept

```
B (the receiver) accepts the trade
  → Trade must be PROPOSED or COUNTERED
  → priceLockedAt = now (prices frozen — no more refreshes)
  → Trade status → ACCEPTED
```

### Case A — Straight card swap (no cash)
```
cashDifference = 0  (proposer didn't offer or request cash)
  → No Stripe PaymentIntent created
  → Both parties notified: "Trade accepted — ship your cards"
```
This applies even if the market values are wildly different — if neither party added cash to the deal, there is nothing to charge.

### Case B — Cash included in the deal
```
cashDifference > 0  (proposer voluntarily added cash, or receiver agreed to pay)
  → cashPayerId's stripeCustomerId looked up
  → Receiver's stripeAccountId looked up as destination
  → Platform fee = 2.5% × avg(proposerValue, receiverValue)
  → PaymentIntent created:
      amount = cashDifference + platformFee  (in cents)
      capture_method = "manual"              ← funds held, NOT charged yet
      application_fee_amount = platformFee   ← platform takes this on capture
      destination = receiver's Connect account
  → stripePaymentIntentId stored on trade
  → Both parties notified: "Trade accepted — ship your cards"
```

**Important:** The customer is charged but money does not move yet. Funds are held until the trade completes or is cancelled.

---

## 6. Decline

```
B declines the trade
  → Trade must be PROPOSED or COUNTERED
  → Prisma transaction:
      - Trade status → CANCELLED
      - All trade cards → status: AVAILABLE, lockedByTradeId: null
  → No Stripe action (PaymentIntent only exists after ACCEPTED)
  → Notification to A: "Trade declined"
```

---

## 7. Cancel

Cancellation can be triggered by either party, but only before both cards are shipped.

### Case A — Cancelled at PROPOSED or COUNTERED
```
Either party cancels
  → No Stripe action (no PaymentIntent yet)
  → Cards unlocked → AVAILABLE
  → Notification to other party: "Trade cancelled"
```

### Case B — Cancelled at ACCEPTED (before shipping)
```
Either party cancels
  → If stripePaymentIntentId exists:
      → PaymentIntent cancelled → hold released immediately, zero charge
  → Cards unlocked → AVAILABLE
  → Notification to other party: "Trade cancelled"
```

### Blocked cancellations
Once the trade reaches `BOTH_SHIPPED`, cancellation is blocked. At that point physical items are in transit — a **dispute** must be opened instead.

---

## 8. Trade Expiry (Background Job)

The expiry job runs every hour automatically.

### 8a. 24-hour warning
```
Job finds trades where:
  status ∈ {PROPOSED, COUNTERED}
  AND expiresAt BETWEEN (now + 23h) AND (now + 24h)
  AND no TRADE_EXPIRY_WARNING notification already exists for this trade
→ Notification sent to both proposer and receiver:
  "Trade [code] expires in 24 hours"
```

### 8b. Auto-cancel on expiry
```
Job finds trades where:
  status ∈ {PROPOSED, COUNTERED}
  AND expiresAt < now
→ For each expired trade, Prisma transaction:
    - Trade status → CANCELLED
    - All trade cards → AVAILABLE, lockedByTradeId: null
→ TRADE_CANCELLED notification to both parties:
  "Trade [code] expired after 7 days of no response"
```

---

## 9. Shipping

### 9a. Submit Tracking Number
```
Party submits carrier + tracking number
  → Trade must be ACCEPTED, BOTH_SHIPPED, A_RECEIVED, or B_RECEIVED
  → Duplicate submission blocked → 409
  → Shipment row created:
      direction: INBOUND (toward verification hub)
      receiverId: the other party (counterparty)
      status: SHIPPED
  → AfterShip registration: tracking number sent to AfterShip API for monitoring
  → If both parties have now submitted tracking:
      Trade status → BOTH_SHIPPED
  → Notification to other party: "Your trade partner has shipped their card"
```

### 9b. Automated Delivery Detection (AfterShip Webhook)
```
AfterShip fires POST /api/webhooks/tracking when carrier marks "Delivered"
  → Webhook signature verified (HMAC-SHA256)
  → shipmentId + tradeId extracted from custom_fields
  → If shipment already DELIVERED → skip (idempotent)
  → Shipment status → DELIVERED
  → Trade status advances:
      BOTH_SHIPPED → A_RECEIVED  (first delivery)
      A_RECEIVED   → B_RECEIVED  (second delivery)
      B_RECEIVED   → BOTH_RECEIVED (this shouldn't happen in sequence,
                                    but both_received fires when second arrives)
  → When BOTH_RECEIVED:
      Notifications to both parties: "Both cards received — verification starting"
  → Always returns HTTP 200 to AfterShip (prevents retries)
```

### 9c. Manual Receipt Fallback
```
PATCH /api/trades/:id/received
  → For cases where AfterShip is unavailable or carrier doesn't report delivery
  → Same state machine as 9b — drives A_RECEIVED → B_RECEIVED → BOTH_RECEIVED
  → User can only confirm receipt of their own inbound shipment
```

---

## 10. Card Verification (Admin)

Triggered once both cards are physically at the verification hub (`BOTH_RECEIVED`).

### 10a. Both Cards Pass
```
Admin submits verification for Card 1: isAuthentic=true, conditionConfirmed=true
Admin submits verification for Card 2: isAuthentic=true, conditionConfirmed=true
  → Two CardVerification rows created
  → Trade status → VERIFIED
  → Admin can now call completeTrade
```

### 10b. A Card Fails — Counterfeit
```
Admin submits: isAuthentic=false
  → Failure reason built: "card appears to be counterfeit or not authentic"
  → Prisma transaction:
      - Trade status → DISPUTED
      - Dispute row created (status: UNDER_REVIEW)
      - Two PENDING OUTBOUND return shipments created
        (platform ships both cards back to their respective owners)
  → Trade PaymentIntent cancelled:
      - Cash-on-top hold released (never charged)
      - 2.5% platform fee cancelled (never collected)
  → At-fault party (card owner) invoiced $24 via Stripe Invoice:
      - Stripe emails them a hosted payment link
      - 7-day payment window
      - Covers cost of both return shipping labels
  → Notification to at-fault party:
      "Your card failed verification: [reason]. Trade cancelled. $24 return shipping fee invoiced — check email."
  → Notification to innocent party:
      "Trade cancelled — other card failed verification: [reason]. No charge to you. Your card will be returned."
```

### 10c. A Card Fails — Condition Mismatch
```
Admin submits: conditionConfirmed=false, conditionNotes="Listed NM, arrived HP"
  → Same flow as 10b, but failure reason:
      "card condition does not match what was listed (Listed NM, arrived HP)"
  → Same invoicing and notifications
```

### 10d. Both Failures on Same Card
```
Admin submits: isAuthentic=false AND conditionConfirmed=false
  → Reason: "card appears to be counterfeit or not authentic; card condition does not match what was listed"
  → Same flow as 10b/10c — single invoice covers both issues
```

---

## 11. Trade Completion

```
Admin calls completeTrade (trade must be VERIFIED)
  → If stripePaymentIntentId exists:
      → capturePaymentIntent called
      → Stripe moves funds:
          cashDifference → receiver's Connect account
          platformFee    → Holo Swaps platform account
          remainder      → nothing (it was exact)
  → Prisma transaction:
      For each TradeItem:
        - UserCollection.userId updated to new owner
        - UserCollection.lockedByTradeId = null
        - UserCollection.status = AVAILABLE (new owner can trade it again)
        - UserCollection.status = TRADED_AWAY on old owner's record
        - CardOwnershipHistory record created (full provenance)
      - Trade status → COMPLETED
      - User.tradeCount incremented for both parties
  → Notifications to both parties: "Trade complete! Check your collection."
```

---

## 12. Disputes (User-Opened)

Users can open a dispute if something goes wrong after both cards are shipped.

### 12a. Opening a Dispute
```
Either party calls POST /api/trades/:id/dispute
  → Trade must be in: BOTH_SHIPPED, A_RECEIVED, B_RECEIVED, BOTH_RECEIVED, or VERIFIED
  → Dispute row created (status: OPENED)
  → Trade status → DISPUTED
  → Other party notified: "A dispute has been opened on your trade"
```

### 12b. Submitting Evidence
```
POST /api/disputes/:id/evidence
  → Participant submits mediaUrls + description
  → DisputeEvidence row created
  → Dispute status → EVIDENCE_SUBMITTED
```

### 12c. Admin Resolution
```
PATCH /api/disputes/:id/resolve
  → Admin submits outcome (RESOLVED_FOR_PROPOSER | RESOLVED_FOR_RECEIVER | RESOLVED_MUTUAL)
      + resolutionNotes
  → Dispute status → chosen outcome
  → Admin manually decides on refunds/returns separately via admin panel
```

---

## 13. Admin-Initiated Dispute
```
Admin calls PATCH /api/trades/:id/admin-dispute
  → Trade can be in any active status
  → Trade status → DISPUTED
  → Dispute created with admin's notes
  → Optional: Stripe refund triggered if paymentIntentId exists
  → Notifications to both parties
```

---

## 14. Reviews

```
POST /api/trades/:tradeId/reviews
  → Trade must be COMPLETED
  → Reviewer is a participant
  → One review per person per trade (unique constraint)
  → TradeReview row created
  → Subject's reputationScore recalculated:
      AVG(all reviews.rating) for that user
  → Subject notified: "You received a new review"
```

---

## 15. Price Alerts

```
User creates alert: cardId + targetPrice + direction (ABOVE | BELOW)
  → PriceAlert row created (isTriggered: false)
  → One alert per (userId, cardId, direction) — duplicate → 409
  → Background pricing job (PricingService) checks alerts periodically:
      - Fetch latest market price from TCGPlayer
      - If price crosses threshold → isTriggered = true
      - PRICE_ALERT notification sent: "Charizard Base Set hit your $500 target"
```

---

## 16. Auto-Match Suggestions

```
GET /api/trades/matches
  → For the logged-in user:
      - Find all AVAILABLE cards in their collection
      - Find all items on their want list
      - Query other users who:
          HAVE cards matching your wants
          AND WANT cards matching your collection
  → matchScore = count of mutual overlapping cards
  → Results sorted by matchScore descending
  → User can propose a trade directly from a match suggestion
```

---

## 17. Stripe Webhooks

Stripe fires events to `POST /api/webhooks/stripe` (raw body, HMAC verified).

| Event | What the system does |
|---|---|
| `payment_intent.succeeded` | Logs success — capture is triggered by admin `completeTrade`, not Stripe |
| `payment_intent.payment_failed` | Logs failure — admin notified to investigate; trade remains in current status |
| `account.updated` | If Connect account `charges_enabled = true` → `stripeAccountVerified = true` on User |

---

## 18. Stripe Connect Onboarding

```
POST /api/stripe/setup-customer
  → Idempotent: if stripeCustomerId already exists → return existing
  → Otherwise: creates Stripe Customer, saves stripeCustomerId on User

POST /api/stripe/connect
  → Idempotent: if stripeAccountId already exists → return new onboarding link
  → Otherwise: creates Stripe Connect Express account, saves stripeAccountId
  → Returns onboarding URL → user completes KYC on Stripe-hosted page
  → Stripe fires account.updated when approved → stripeAccountVerified = true
```

A user must have both a `stripeCustomerId` (to pay) and a verified `stripeAccountId` (to receive) before a cash-on-top trade can be accepted.

---

## 19. Blocking & Reporting

```
POST /api/users/:userId/block
  → UserBlock row created
  → Blocked user will not appear in match suggestions for the blocker
  → No notification sent to the blocked user

POST /api/users/:userId/report
  → UserReport row created (with optional tradeId)
  → Admin reviews via GET /api/admin/reports
  → PATCH /api/admin/reports/:id/resolve marks it handled
```

---

## 20. Admin — User Bans

```
PATCH /api/admin/users/:id/ban
  → isBanned = true, bannedAt = now
  → Banned user's next login attempt → 403
  → Existing JWTs continue to work until they expire (7 days max)
  → Cannot ban another admin

PATCH /api/admin/users/:id/unban
  → isBanned = false, bannedAt = null
```

---

## 21. Complete Trade Status Lifecycle

```
PROPOSED
  ├─► COUNTERED      (counter offer made)
  │     └─► ACCEPTED (receiver accepts counter)
  ├─► ACCEPTED       (receiver accepts original)
  │     └─► BOTH_SHIPPED
  │           ├─► A_RECEIVED    (first card delivered)
  │           │     └─► B_RECEIVED
  │           │           ├─► BOTH_RECEIVED
  │           │           │     └─► VERIFIED
  │           │           │           └─► COMPLETED ✓
  │           │           └─► DISPUTED ✗
  │           └─► DISPUTED ✗
  ├─► CANCELLED ✗    (declined / cancelled / expired)
  └─► DISPUTED ✗     (admin-initiated at any point)
```

---

## 22. Who Gets Charged What — Summary

| Scenario | Proposer | Receiver | Platform |
|---|---|---|---|
| Straight card swap, trade completes | $0 | $0 | $0 |
| Proposer added cash, trade completes | cashAmount + 2.5% fee | $0 | 2.5% of avg value |
| Receiver agreed to pay cash, trade completes | $0 | cashAmount + 2.5% fee | 2.5% of avg value |
| Trade cancelled before ACCEPTED | $0 | $0 | $0 |
| Trade cancelled after ACCEPTED | Hold released — $0 | $0 | $0 |
| Card fails verification | $0 (hold released) | $0 | $0 (fee not collected) |
| At-fault party return shipping | $24 if they sent bad card | $24 if they sent bad card | Shipping cost covered |
| Trade expires (auto-cancel) | $0 | $0 | $0 |
