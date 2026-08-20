# Indish — Full-Stack Restaurant Website + Loyalty Program

Three apps, three separate local dev servers, no shared codebase — they interlink only via
deep links (see "Cross-app links" below), never a shared database or shared login.

```
indish-restaurant-project-updated/
  frontend/        React + Vite + TS + React Router + Tailwind v4 + Framer Motion
                    Public site (branch pages, menu, reservations) + admin dashboard.
  backend/          Express + TS + Prisma + MySQL, JWT admin auth (httpOnly cookie).
  indish-loyalty/   TanStack Start (React 19, SSR) + MySQL, staff-facing loyalty program.
                    Its own git repo (has an `origin` remote) — separate from this one.
  deploy/           Nginx config, PM2 ecosystem file, DigitalOcean droplet runbook
                    (covers frontend + backend only — indish-loyalty isn't in this runbook yet).
```

Built to preserve the original Lovable design language for the restaurant site (see
`frontend/README.md` for the design-kit note) while replacing the architecture end to end.

## Quick start (local development)

**1. Database** — have a local MySQL running. Both `backend` and `indish-loyalty` use it, as
two separate databases (`indish`, `indish_loyalty`) on the same MySQL server.

**2. Backend**
```bash
cd backend
npm install
cp .env.example .env        # set DATABASE_URL and JWT_SECRET at minimum
npx prisma generate
npx prisma migrate dev --name init
SEED_ADMIN_PASSWORD="admin123" npx prisma db seed
npm run dev                 # http://localhost:4000
```

**3. Frontend** (separate terminal)
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173, proxies /api -> localhost:4000
```

Visit `http://localhost:5173`. Admin dashboard is at `/admin` — log in with the admin account
seeded by `prisma db seed`.

**4. Loyalty app** (separate terminal, optional — independent of the two above)
```bash
cd indish-loyalty
npm install
cp .env.example .env        # set DB_* to a second local database, e.g. indish_loyalty
npm run db:setup            # creates schema + seeds LUSAKA and KITWE settings + a manager login
npm run dev                 # http://localhost:8080 — NOT :3000 despite what its own README says
```

Log in with `admin` / `admin123` (or whatever you set `SEED_ADMIN_*` to). Use the branch
switcher in the sidebar to flip between Lusaka and Kitwe — each branch has fully independent
campaign settings, reward options, and customers.

## Cross-app links

The restaurant admin and loyalty dashboard link to each other (phone-number deep links, opened
in a new tab) without any shared backend:
- Reservation detail drawer → "View loyalty profile" → loyalty app's Quick Search, pre-filled.
- Loyalty customer page → "View reservations" → restaurant admin's Reservations tab, pre-filtered.

Configured via `VITE_LOYALTY_APP_URL` (frontend/.env) and `VITE_RESTAURANT_ADMIN_URL`
(indish-loyalty/.env) — both default to the local dev ports above.

## What's implemented

**Restaurant site + backend**
- Branch selector, branch home pages, full animated menu, all matching the design kit's tokens
- Brand palette matches the real Indish logo (royal blue + gold on near-black), with real Kitwe
  interior photography wired into the homepage and a lightbox gallery
- Full current menu (190 dishes, 13 categories) transcribed from the restaurant's own May 2025
  menu, shared across both branches; menu cards show name + price only, click/tap opens a modal
  with the full description, badges and veg/non-veg tag; veg/non-veg filter on the menu page
- 3-step reservation flow: customer details -> mobile money payment + transaction ID -> confirmation
- Reservations can be booked as a **Standard Table** or a **Private Party / Family Booking**
  (adds an occasion/event-type field and swaps the notes field to "special requests")
- Reservations are only bookable within a **rolling 24-hour window** — no last-minute-only-too-late
  bookings, no booking weeks out either. Enforced server-side (Zod `superRefine`) and mirrored in
  the date/time picker's UI.
- Deposit (ZMW 100/guest) always calculated server-side, never trusted from the client
- **WhatsApp notifications** (Meta Cloud API) on confirmed booking — customer confirmation uses an
  approved message template (bypasses the 24h customer-service-window restriction); staff copy
  uses free text. See `backend/src/services/whatsapp.service.ts`.
- Booking references in the `IND-LU-XXXXX` / `IND-KI-XXXXX` format
- Admin dashboard, tabbed:
  - **Reservations** — search/filter/paginate, edit status & notes, CSV export, link to that
    customer's loyalty profile
  - **Reports** — reservations-per-day chart + headline stats (today's covers, average party
    size, party/family bookings, cancellations, no-shows), filterable by branch and date range
  - **Availability** — manually publish "X seats left" or "fully booked" for a branch/date;
    shows as a live banner on the public reservation page once a date is picked
  - **Site Content** — edit the homepage headline/subheading, about text, hours, phone/address
    overrides and a site-wide announcement banner, globally or per branch, without a redeploy
- JWT admin auth via httpOnly cookie, rate limiting, Zod validation, Helmet, scoped CORS
- Nginx + PM2 + Let's Encrypt deployment docs for a DigitalOcean Droplet

**Loyalty program** (`indish-loyalty/`, separate app)
- Branch-aware throughout: Lusaka and Kitwe each have their own minimum spend, campaign
  duration, visits-required, reward-visit threshold, and reward options — not shared rules.
- Branch switcher persists via cookie; every page/query is scoped to the selected branch
  (or, for an individual customer's page, to that customer's own branch).
- Visit tracking, reward claiming, campaign reset/extend/disable, CSV reports.
- **WhatsApp welcome message** on registration, to the customer and a configured owner/staff
  number (`LOYALTY_NOTIFY_PHONE_NUMBER`) — same Meta Business number as the restaurant backend.

## What's stubbed or needs your input before going live

- **WhatsApp message templates** — the restaurant's `reservation_confirmation` template is
  approved and wired in. The loyalty app's welcome message still sends as free text (works only
  within an open 24h session with the recipient) until a loyalty-registration template is
  approved and set via `WHATSAPP_LOYALTY_TEMPLATE_NAME` in `indish-loyalty/.env`.
- **WhatsApp test-mode limits** — both apps currently share one Meta test phone number
  (`+1 555...`), capped to pre-registered test recipients. Real customers won't receive anything
  until a verified production WhatsApp number replaces it in both `.env` files.
- **Payment verification is manual** — a transaction ID is required to create a reservation, but
  nothing here calls Airtel/MTN/Zamtel's APIs to confirm the money actually landed (their
  merchant APIs need business accounts and paperwork with each telco). Payments are created with
  status `PENDING`; staff verify against the mobile money statement and update the record from
  the admin dashboard. Wiring real-time verification is a follow-up once you have merchant API
  access with each provider.
- **Lusaka photography** — the gallery and hero currently use the original placeholder photo for
  Lusaka since only Kitwe photos were supplied; swap in real Lusaka shots the same way Kitwe's
  were added in `frontend/src/assets/images` + `frontend/src/data/branches.ts`.
- **Menu pricing/availability** — transcribed directly from the restaurant's own May 2025 menu
  PDF (the one that lists both branches); double check nothing has changed since.
- **Domain-specific values** — `frontend/index.html` has OG/canonical URLs (`indishkitwe.com`)
  and `deploy/nginx.conf` / `DEPLOY.md` assume that domain — update if it ever changes.
- **`deploy/` doesn't cover `indish-loyalty/` yet** — it's a separate TanStack Start app (SSR,
  Netlify Functions by default per its own README) with its own deployment story; the droplet
  runbook only stands up the frontend + backend.
