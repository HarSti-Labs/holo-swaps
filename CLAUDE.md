# Claude Code Instructions — Holo Swaps

## Project Structure

```
holo-swaps/
├── holo-swaps-service/   # Express + TypeScript backend (port 4000)
├── holo-swaps-ui/        # Next.js 14 App Router frontend (port 3000)
└── planning/
    ├── COMPLETED.md      # Log of everything built so far
    ├── FEATURES.md       # Planned feature specs and roadmap
    └── REFERENCE.md      # System flows, state machines, edge cases
```

## After Completing Any Feature or Bug Fix

**Always update the planning docs before finishing.** This keeps context intact across sessions.

### 1. `planning/COMPLETED.md`
Add an entry under the appropriate section (Backend, Frontend, Bug Fixes, etc.) describing what was built. Include:
- What files were changed and why
- Any schema changes (`prisma db push` required)
- New API endpoints or changes to existing ones
- New UI components or pages

### 2. `planning/FEATURES.md`
- If the completed work was listed as a planned feature or roadmap item, mark it done or remove it from the "Next Priority" section
- If new future ideas or known limitations were discovered during implementation, add them to the relevant section

### 3. `planning/REFERENCE.md`
- If the work introduced or changed a system flow, state transition, or edge case, add or update the relevant section
- Examples: new email notification flow, changes to trade lifecycle, new filter/query behavior

---

## Key Technical Rules

- **Schema changes**: Always use `prisma db push` (never `migrate dev`) — this project uses Supabase
- **Email sending**: Always fire-and-forget (no `await`) — failures are logged, never thrown
- **Auth state**: JWT stored in localStorage, managed by Zustand `useAuthStore`
- **API base**: Backend at `http://localhost:4000`, frontend uses `/lib/api/client.ts` axios instance
- **No mock data**: All data comes from the real PostgreSQL/Supabase database

## Stack Reminders

| Layer | Tech |
|---|---|
| Backend | Express + TypeScript, Prisma ORM, PostgreSQL (Supabase) |
| Frontend | Next.js 14 App Router, Tailwind CSS, Zustand, React Query |
| Auth | JWT (7d) + DB-backed refresh tokens (30d) |
| Storage | Supabase Storage (`card-media` bucket) |
| Email | Nodemailer (Resend SMTP in prod) |
| Payments | Stripe + Stripe Connect Express |
