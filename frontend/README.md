# Indish — Frontend

React + Vite + TypeScript frontend for the Indish restaurant website (Lusaka & Kitwe branches).
Routing is React Router; data fetching is plain `fetch` via `lib/api.ts` against the Express
backend in `../backend`. See the root `README.md` for the full-project picture (backend, and the
separate loyalty app in `../indish-loyalty`).

## What's here

- Public site: branch selector, branch home pages, full animated menu (190 dishes across both
  branches, veg/non-veg filter, modal detail view), photo gallery.
- 3-step reservation flow (customer details → mobile money payment + transaction ID →
  confirmation), bookable only within a rolling 24-hour window from now.
- Admin dashboard (`/admin`, JWT cookie auth): Reservations (search/filter/paginate/export,
  "View loyalty profile" deep link), Reports, Availability, Site Content.
- SEO/OG/Twitter metadata, semantic HTML, skip-to-content link, visible focus states.

## Run it

```bash
npm install
cp .env.example .env   # sets VITE_LOYALTY_APP_URL; adjust if the loyalty app runs elsewhere
npm run dev             # http://localhost:5173, proxies /api -> http://localhost:4000 (the backend)
npm run build           # production build to dist/
```

The backend (`../backend`) needs to be running for anything API-driven (reservations, live site
content, admin login) — the public site otherwise falls back to static defaults if the API is
unreachable (see `src/context/SiteContentContext.tsx`), so it still renders without a backend.

## Structure

```
src/
  assets/images/        hero + branch photography
  components/
    admin/               ReservationEditDrawer and other admin-only pieces
    layout/              Navbar, Footer, Layout (route transitions)
    reservation/          the 3-step reservation flow's steps
    sections/            Hero, MenuSection, MenuCard, ReviewsSection, ContactSection
    ui/                  shadcn primitives + button
  context/               BranchContext, SiteContentContext (admin-editable copy w/ fallbacks)
  data/                  branches.ts, menu.ts, reservation.ts — edit these to change content
  lib/                   api.ts (fetch wrapper), loyalty.ts (cross-app deep link to indish-loyalty)
  pages/
    admin/                AdminLoginPage, AdminDashboardPage + tabs/
    BranchSelectPage, HomePage, MenuPage, ReservePage
  types/                  shared TS types
  index.css               design tokens (oklch, Marcellus/Karla fonts, ember gradients)
```

## Design notes

- Dark, warm "candle-lit spice house" palette — no light mode, matching the kit.
- Signature interaction: the branch selector's split-screen panels widen/dim on hover with an
  ember-gradient seam between them, tying the tandoor/ember motif into the core choice a visitor
  makes on arrival.
- Motion: page-load stagger reveals, scroll-triggered reveals (`whileInView`), shared-layout tab
  indicator on the menu, image zoom on hero load and branch-card hover.
