# Indish — Backend API

Express + TypeScript + Prisma + MySQL. JWT admin auth (httpOnly cookie). Zod validation on
every input. The frontend never talks to MySQL directly — everything goes through this API.

## Setup

```bash
npm install
cp .env.example .env        # fill in real values, especially JWT_SECRET and DATABASE_URL
npx prisma generate
npx prisma migrate dev --name init
SEED_ADMIN_PASSWORD="a-strong-password" npx prisma db seed
npm run dev                 # http://localhost:4000
```

> **Note:** `prisma generate` and `prisma migrate` download a small query-engine binary from
> Prisma's CDN the first time you run them. That requires normal internet access — it isn't
> optional and isn't a bug if it fails in a fully offline/sandboxed environment.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with hot reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build (what PM2 runs in production) |
| `npm run prisma:migrate` | Apply migrations in production (`migrate deploy`) |
| `npm run prisma:studio` | Browse the database visually |

## API overview

### Public
- `POST /api/reservations` — create a reservation. Requires `transactionId`; deposit amount is
  always recalculated server-side from `guests`, never trusted from the client.
- `GET /api/reservations/:reference` — look up a booking by its reference (e.g. `IND-LU-A3F9C`)
  for the confirmation screen.
- `GET /api/health` — liveness check for Nginx/monitoring.

### Admin (requires login — see `/api/admin/auth`)
- `POST /api/admin/auth/login`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/me`
- `GET /api/admin/reservations` — filter by `branch`, `status`, `from`/`to` date, `search`
  (name/phone/reference), paginated.
- `GET /api/admin/reservations/:id`
- `PATCH /api/admin/reservations/:id` — edit details, change status, cancel, mark completed.
- `GET /api/admin/reservations/export` — CSV export of the current filter set.

## Security notes

- Passwords hashed with bcrypt (cost 12); login uses a constant-time-ish dummy-hash comparison
  to avoid leaking which emails are registered.
- Admin JWT is stored in an `httpOnly`, `sameSite=lax` cookie (not `localStorage`) — not
  readable by JS, so an XSS bug in the frontend can't steal the session token directly.
- `helmet`, scoped CORS with `credentials: true`, and three separate rate limiters (general API,
  login, reservation creation).
- All external input validated with Zod before touching the database.

## Data model

See `prisma/schema.prisma`. Tables: `branches`, `admins`, `reservations`, `payments`. There's
deliberately no `users` table for customers — the spec's reservation flow is guest checkout by
design (name + phone are captured directly on the reservation), and only staff need accounts.
