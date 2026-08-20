# Indish Loyalty

A staff-facing loyalty program dashboard for Indish (Fusion Food & Cocktails), built with
TanStack Start (React, SSR) and a MySQL database.

## Stack

- **Frontend/SSR**: TanStack Start (React 19, file-based routing)
- **Database**: MySQL — manage it with **MySQL Workbench**
- **Auth**: signed HTTP-only session cookies + bcrypt password hashing (no third-party auth service)
- **Hosting**: Netlify (Netlify Functions run the SSR server + API)

## 1. Set up the database

You need a running MySQL server. Two options:

### Option A: Aiven for MySQL (recommended — free, no credit card)
1. Sign up at https://aiven.io and create a **MySQL** service on the **Free** plan.
2. Wait for the service status to say **Running** (not "Building").
3. On the service's Overview page, note: **Host**, **Port**, **User** (`avnadmin`), **Password**,
   **Database name** (`defaultdb`).
4. Click **CA certificate → Show**, copy the whole thing (including the
   `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----` lines), and save it as a file
   named `aiven-ca.pem` in the project root. Saving it as its own file — rather than pasting it
   into `.env` — avoids multi-line `.env` parsing problems, especially on Windows.

### Option B: Local MySQL (development only)
Install MySQL, open **MySQL Workbench**, and make sure the server is running on
`127.0.0.1:3306`. No SSL needed for `DB_SSL`/`DB_SSL_CA_PATH` in this case.

### Option C: Other managed MySQL
Railway, Clever Cloud, PlanetScale, etc. all work the same way — get host/port/user/password
and (if required) a CA cert, and fill in `.env` as below.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values. **On Windows**, create it in PowerShell
rather than Notepad's "Save As" dialog (Notepad silently appends `.txt` to files without a
recognized extension):

```powershell
@"
DB_HOST=your-host-here
DB_PORT=your-port-here
DB_USER=avnadmin
DB_PASSWORD=your-password-here
DB_NAME=defaultdb
DB_SSL=true
DB_SSL_CA_PATH=./aiven-ca.pem

SESSION_SECRET=generate-one-below

SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin123
SEED_ADMIN_NAME=Your Name
"@ | Out-File -FilePath .env -Encoding utf8 -NoNewline
```

Generate `SESSION_SECRET` with:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
(or `openssl rand -base64 32` if you have OpenSSL). Paste the result in place of
`generate-one-below`.

Verify the file actually saved correctly:
```powershell
Get-ChildItem -Force    # confirm .env (not .env.txt) is listed
Get-Content .env        # confirm it shows your real values, not placeholders
```

If you're using local MySQL instead of Aiven, set `DB_SSL=false` and leave `DB_SSL_CA_PATH` blank.

## 3. Install dependencies and initialize the database

```bash
npm install
npm run db:setup
```

This creates all tables (`db/schema.sql`), default campaign settings, a manager login, and a
few demo customers so the dashboard isn't empty (skip demo data with `npm run db:setup:no-demo`).

You can now open the database in **MySQL Workbench** at any time to inspect or edit data
directly — the app is just a regular MySQL database underneath (tables: `staff`, `settings`,
`reward_options`, `customers`, `visits`).

## 4. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` (redirects to `/login`). Sign in with the admin account you
configured in step 2.

## 5. Deploy to Netlify

1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project**, and pick the repo.
   Netlify will read `netlify.toml` automatically (build command `npm run build`, publish `dist`).
3. Under **Site settings → Environment variables**, add the same keys from your `.env`:
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `SESSION_SECRET`.
   Use your **production** MySQL host here (from step 1), not `127.0.0.1`.

   For the CA certificate: `DB_SSL_CA_PATH` won't work on Netlify (there's no `aiven-ca.pem`
   file deployed with your code). Instead, add an env var called **`DB_SSL_CA`** and paste the
   full certificate contents directly as its value — Netlify's environment variable editor
   handles multi-line values fine, unlike a local `.env` file. The app checks `DB_SSL_CA_PATH`
   first and falls back to `DB_SSL_CA`, so this works without any code changes.
4. Deploy. Netlify Functions will run the SSR server and all data operations against your
   MySQL database.
5. Before going live, run `npm run db:setup` once against the production database (from your
   own machine, pointing `.env` at the production `DB_*` values) to create the schema and the
   first manager login.

## Project structure

```
src/
  routes/            TanStack Start file-based routes
    _app.tsx          authenticated app shell (sidebar + auth guard)
    _app/              dashboard, customers, register, rewards, reports, staff, settings
    login.tsx          sign-in page
  lib/
    functions.ts       server functions (the "API layer") — register/login/add visit/etc.
    server/            DB pool, session/cookie helpers — never imported from client code
    types.ts, format.ts
  components/          UI components (shadcn/ui + app-specific)
db/
  schema.sql           MySQL schema
scripts/
  seed.mjs             creates schema + default settings + admin account (npm run db:setup)
```

## Notes

- Every data mutation (add visit, claim reward, register customer, settings changes, reset/
  extend/disable campaign) goes through a server function in `src/lib/functions.ts` — nothing
  is mocked.
- Only managers can edit settings, disable/reset/extend customer campaigns. Regular staff can
  register customers, log visits, and claim rewards.
- Customer `status` (active/completed/expired/disabled) is derived on read from
  `campaign_end`, `reward_claimed`, and a `disabled` flag — it's never stored as stale text.
