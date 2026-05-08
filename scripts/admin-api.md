# HoloSwaps Admin API Reference

API calls that have no UI page. Run these with curl or any HTTP client (Postman, Insomnia, etc.)

---

## Setup

You need an admin JWT token. Get one by logging in:

```bash
curl -X POST https://api.holoswaps.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'
```

Copy the `token` from the response and replace `YOUR_TOKEN` in the calls below.

For local dev, replace `https://api.holoswaps.com` with `http://localhost:4000`.

---

## Users

### Find a user by username (to get their ID)
```bash
curl https://api.holoswaps.com/api/admin/users?search=USERNAME \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Toggle free shipping for a user
Calling this once enables it, calling it again disables it.
```bash
curl -X PATCH https://api.holoswaps.com/api/admin/users/USER_ID/free-shipping \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Manually set reputation score and tier
Useful for seeding demo accounts. Run directly against the DB (no API endpoint for this):
```bash
cd holo-swaps-service && node -e "
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
prisma.user.update({
  where: { username: 'USERNAME' },
  data: { reputationScore: 5.0, tier: 'GOLD' },
  select: { username: true, reputationScore: true, tier: true }
}).then(u => { console.log(u); return prisma.\$disconnect(); });
"
```
Valid tiers: `BRONZE`, `SILVER`, `GOLD`, `DIAMOND`

### Ban a user
```bash
curl -X PATCH https://api.holoswaps.com/api/admin/users/USER_ID/ban \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Unban a user
```bash
curl -X PATCH https://api.holoswaps.com/api/admin/users/USER_ID/unban \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Trades

### Force a trade to a specific status
Valid statuses: `PROPOSED`, `COUNTERED`, `ACCEPTED`, `SHIPPED`, `COMPLETED`, `CANCELLED`
```bash
curl -X PATCH https://api.holoswaps.com/api/trades/TRADE_ID/admin-force-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CANCELLED"}'
```

### Mark a trade as completed (admin)
```bash
curl -X PATCH https://api.holoswaps.com/api/trades/TRADE_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

- All admin routes require `isAdmin: true` on your user account.
- USER_ID and TRADE_ID are UUIDs found in the database or from the search/list endpoints above.
