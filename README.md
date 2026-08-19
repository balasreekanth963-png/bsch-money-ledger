# BSCH Money Ledger

**Manage Every Rupee. Track Every Transaction.**
Owned and branded by **Bala Sir Career Hub Consultancy (BSCH)**.

A mobile-first, multi-tenant money/loan/interest ledger. Each BSCH client
(e.g. Ram Mohan, Suresh Kumar, ...) gets a fully isolated view of their own
customers, loans, payments, and reports.

> **Build status: Phase 1 of 12 — Project setup, auth, branding, mobile
> shell.** No financial data tables exist yet; those arrive in Phase 2
> onward. See "Roadmap" below.

---

## 1. Prerequisites

Install these once on your computer:

1. **Node.js 18.18+ (LTS recommended)**
   Download: https://nodejs.org
   Check install:
   ```bash
   node -v
   npm -v
   ```
2. **Git**
   Download: https://git-scm.com
   Check install:
   ```bash
   git --version
   ```
3. **A GitHub account** — https://github.com (free)
4. **A Supabase account** — https://supabase.com (free tier)
5. **A Vercel account** — https://vercel.com (free tier, for deployment later)

---

## 2. Supabase Setup

1. Go to https://supabase.com/dashboard and click **New Project**.
2. Choose an organization, name it `bsch-money-ledger`, set a database
   password (save it somewhere safe), pick a region close to India
   (e.g. Mumbai/`ap-south-1` if offered), and click **Create new project**.
3. Wait for provisioning to finish (1–2 minutes).
4. Go to **Project Settings → API**. You will need:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret,
     server-side only — not used yet in Phase 1, but wire it in now)
5. Go to **Authentication → Providers** and make sure **Email** is enabled.
6. Go to **Authentication → Users** and click **Add user** to manually
   create the first BSCH client login (e.g. Ram Mohan's email + a
   temporary password). We will move this into a proper sign-up/invite
   flow in a later phase.

The actual database tables (`profiles`, `clients`, `customers`, `loans`,
`transactions`, `interest_entries`) and Row Level Security policies are
built in **Phase 2** — intentionally not included yet, per the phased plan.

---

## 3. Project Setup (local)

```bash
# 1. Unzip / clone the project, then enter it
cd bsch-money-ledger

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env.local

# 4. Edit .env.local and paste in your real Supabase values
#    (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#     SUPABASE_SERVICE_ROLE_KEY)

# 5. Run the development server
npm run dev
```

Open **http://localhost:3000** — it should redirect you to `/login`.

Sign in using the email/password you created in Supabase Authentication →
Users (step 6 above). You should land on `/dashboard` and see:

- `BSCH MONEY LEDGER` header
- `Welcome, {your name or email}` (pulled from your Supabase Auth profile,
  never hard-coded)
- Quick action buttons
- Summary cards, currently all ₹0 (honest zero-state — no fake numbers,
  since no financial tables exist yet)
- Mobile bottom navigation (on phone-width screens)
- BSCH footer

---

## 4. How to Test Phase 1

1. **Mobile layout**: open Chrome DevTools → Toggle device toolbar → pick
   a phone (e.g. Pixel 7) and confirm no horizontal scrolling, large
   tappable buttons, and the bottom nav bar.
2. **Protected routes**: while logged out, try visiting
   `http://localhost:3000/dashboard` directly — you should be redirected
   to `/login`.
3. **Login redirect**: while logged in, visit `/login` directly — you
   should be redirected to `/dashboard`.
4. **Branding**: confirm "BSCH MONEY LEDGER", the tagline, and the
   "Powered by BSCH — Bala Sir Career Hub Consultancy" line appear on
   both the login screen and the dashboard.
5. **Sign out**: tap **Logout** in the header — you should return to
   `/login` and be unable to reach `/dashboard` again until you sign in.
6. **Forgot password**: enter your email and tap **Forgot Password** —
   Supabase should send a reset email (check your inbox/spam).
7. **Type safety**: run `npm run type-check` — it should complete with
   no errors.

---

## 5. Project Structure

```
app/
  layout.tsx            Root layout (fonts, metadata, PWA theme)
  page.tsx               Redirects "/" to /login or /dashboard
  globals.css             Tailwind base + BSCH global styles
  login/
    page.tsx              Login screen (BSCH branded)
  dashboard/
    layout.tsx             Dashboard shell: header, bottom nav, footer
    page.tsx                Dashboard home: welcome + summary cards
components/
  BSCHLogo.tsx             Reusable BSCH brand mark
  BSCHFooter.tsx           Reusable BSCH footer
  BottomNav.tsx            Mobile bottom navigation
  SummaryCard.tsx          Dashboard metric card
  QuickActionButton.tsx    Large mobile-friendly action button
  SignOutButton.tsx        Logout control
lib/
  supabase/
    client.ts              Browser Supabase client
    server.ts               Server Component / Route Handler client
    middleware.ts            Session refresh + route protection logic
  utils/
    format.ts                formatRupees() / formatDate() helpers
types/                     (reserved for Phase 2 database types)
public/
  manifest.json             PWA manifest
  icons/                     App icons
middleware.ts             Next.js middleware entry point
.env.example               Environment variable template
```

---

## 6. Environment Variables

See `.env.example`. Copy it to `.env.local` and fill in real values.
**Never commit `.env.local`** — it's already in `.gitignore`.

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser and must
never be imported into any file under `app/` that runs on the client
(anything marked `"use client"`). It is reserved for future server-only
scripts (e.g. demo data seeding, the future BSCH Admin panel).

---

## 7. Deploying to Vercel (when you're ready)

1. Push this project to a GitHub repository.
2. Go to https://vercel.com/new and import that repository.
3. In **Environment Variables**, add the same three variables from
   `.env.local`.
4. Click **Deploy**.
5. Once deployed, add your Vercel domain to Supabase under
   **Authentication → URL Configuration → Redirect URLs** so password
   reset links work in production.

(This step is optional for now — local development is enough to review
Phase 1.)

---

## 8. Roadmap (do not build ahead of the current phase)

- [x] **Phase 1** — Project setup, Supabase auth, BSCH branding, mobile
      shell, login screen, dashboard shell ← **you are here**
- [ ] Phase 2 — Database schema (`profiles`, `clients`, `customers`,
      `loans`, `transactions`, `interest_entries`) + Row Level Security
- [ ] Phase 3 — Customer management
- [ ] Phase 4 — Money Given
- [ ] Phase 5 — Money Taken
- [ ] Phase 6 — Payment system (interest-first allocation)
- [ ] Phase 7 — Interest calculation engine (decimal-safe)
- [ ] Phase 8 — Live dashboard (real aggregates, not zero-state)
- [ ] Phase 9 — Reports
- [ ] Phase 10 — Testing (incl. the ₹10,000 / 1% / ₹40 / ₹100 payment
      allocation example)
- [ ] Phase 11 — PWA / mobile optimization polish
- [ ] Phase 12 — Production deployment

Future (explicitly out of scope for now): WhatsApp/SMS reminders, payment
gateway, AI features, native Android app, offline sync, GST/tax/KYC,
subscription billing, BSCH Admin dashboard.

---

**BSCH Money Ledger** — Powered by BSCH, Bala Sir Career Hub Consultancy.
