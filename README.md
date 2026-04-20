# Holo Swaps — Pokémon Card Trading Platform

A full-stack peer-to-peer Pokémon card trading platform with verified middleman escrow service, live market pricing, and smart trade matching.

---

## Project Structure

```
holo-swaps/
├── holo-swaps-ui/       # Next.js 14 app (App Router)
└── holo-swaps-service/  # Express + Prisma API
```

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** with custom design tokens
- **Zustand** for auth state
- **TanStack Query** for server state / caching
- **Axios** for API calls
- **Framer Motion** for animations
- **Stripe.js** for payment UI

### Backend
- **Express** + **TypeScript**
- **Prisma** ORM
- **PostgreSQL** database
- **Stripe Connect** for escrow payments
- **JWT** authentication
- **Zod** for validation
- **Winston** for logging

### Architecture Pattern
```
Controllers → Services (Interface + Implementation) → Repositories (Interface + Implementation) → Prisma
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or hosted — Supabase recommended)
- Stripe account (for payments)
- TCGPlayer API key (for live card pricing)

---

### Backend Setup

```bash
cd holo-swaps-service
npm install

# Copy and fill in environment variables
cp .env .env

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start dev server (port 4000)
npm run dev
```

### Frontend Setup

```bash
cd holo-swaps-ui
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > .env.local
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key" >> .env.local

# Start dev server (port 3000)
npm run dev
```

---

## Environment Variables

### Backend `.env`
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `TCGPLAYER_API_KEY` | TCGPlayer API key for live pricing |
| `SUPABASE_URL` | Supabase project URL (for photo storage) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `FRONTEND_URL` | Frontend URL for CORS |

### Frontend `.env.local`
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_test_...) |

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh JWT |
| GET | `/api/auth/me` | Get current user |

### Trades
| Method | Path | Description |
|---|---|---|
| GET | `/api/trades` | Get my trades (paginated) |
| GET | `/api/trades/matches` | Get smart matches |
| GET | `/api/trades/:id` | Get trade detail |
| POST | `/api/trades` | Propose a trade |
| POST | `/api/trades/:id/counter` | Counter offer |
| PATCH | `/api/trades/:id/accept` | Accept trade |
| PATCH | `/api/trades/:id/decline` | Decline trade |
| PATCH | `/api/trades/:id/cancel` | Cancel trade |
| PATCH | `/api/trades/:id/tracking` | Submit tracking number |

### Admin (requires `isAdmin: true`)
| Method | Path | Description |
|---|---|---|
| PATCH | `/api/trades/:id/verify` | Verify received cards |
| PATCH | `/api/trades/:id/complete` | Complete trade + release payment |
| PATCH | `/api/trades/:id/dispute` | Flag trade as disputed |

---

## Trade State Machine

```
PROPOSED → COUNTERED → ACCEPTED → BOTH_SHIPPED
                                       ↓
              CANCELLED ← ← ←  A_RECEIVED / B_RECEIVED
                                       ↓
                               BOTH_RECEIVED
                                       ↓
                                  VERIFIED
                                  ↙     ↘
                            COMPLETED  DISPUTED
```

---

## Key Design Decisions

**Why separate service interfaces?**
Enables dependency injection and easy testing — swap implementations without changing controllers.

**Why Stripe manual capture?**
Funds are authorized (reserved) when trade is accepted, but not actually charged until cards are verified and trade is completed. If anything fails, authorization is cancelled with zero charge.

**Why Stripe Connect Express?**
Keeps you legally clean as a platform. You're never a money transmitter — Stripe handles KYC/compliance for payouts to users.

**Why repository pattern?**
Decouples data access from business logic. If you ever move from PostgreSQL to something else, only the repository implementations change.

---

## What's Next to Build

- [ ] User profile pages with collection/wants tabs
- [ ] Trade proposal flow UI (card selection + value calculator)
- [ ] Trade detail page (status timeline, tracking, messaging)
- [ ] Admin dashboard for verification workflow
- [ ] Card search + autocomplete (TCGPlayer catalog)
- [ ] Photo upload (Supabase Storage integration)
- [ ] Stripe Connect onboarding flow
- [ ] Email notifications (Resend)
- [ ] Reputation / review system after completed trades
- [ ] Scammer blacklist
