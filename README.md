# Virtual Library – The Focus Hub

Next.js app with PostgreSQL (Prisma), NextAuth.js (Email/Password + Google), and Tailwind (Coffee/Cream theme).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` (PostgreSQL) and `AUTH_SECRET`
   - Optional: `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for Google login

3. **Database** (required before `npm run build` works fully, and for the site to run)
   ```bash
   npx prisma generate
   npx prisma db push
   # or tracked migrations:
   # npx prisma migrate dev
   # production: npx prisma migrate deploy
   ```
   Migrations live under `prisma/migrations/` (e.g. `remove_shared_todo` drops the old `SharedTodo` table if it exists).
   If you see **`The table public.AppSetting does not exist`** (or `BlogPost`), your `DATABASE_URL` database has no schema yet — run `db push` or `migrate deploy` on **that same database** (local + production).

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` – start dev server
- `npm run dev:turbo` – start dev server with Turbopack
- `npm run build` – production build
- `npm run start` – start production server
- `npm run lint` – run ESLint

## Meet Add-on Features

- Side panel + main stage flow for Google Meet add-on
- Live poll and quiz synchronization through Meet event bus (with BroadcastChannel fallback in local dev)
- Focus guard with 20-20-20 reminders and tab-away alert events
- Pomodoro heartbeat endpoint and Study Coins gamification ledger
- Scholar leaderboard API with streak + coin view

## Meet Add-on API Endpoints

- `GET /api/meet-addon/polls`
- `POST /api/meet-addon/poll-response`
- `GET|POST /api/meet-addon/today-task`
- `POST /api/meet-addon/focus/heartbeat`
- `GET /api/meet-addon/leaderboard`
- `POST /api/meet-addon/login`
- `POST /api/meet-addon/link-with-code`
- `POST /api/meet-addon/link-code`

## Troubleshooting

- **Database does not exist**  
  Run `npx prisma db push` using the same `DATABASE_URL` your app uses.

- **Missing auth secret (`MissingSecret`)**  
  Ensure at least one is set: `AUTH_SECRET` or `NEXTAUTH_SECRET` (same value recommended).

- **`next dev` lock error (`.next/dev/lock`)**  
  Stop old Next process and restart one instance only.

- **Login callback URL issues in production**  
  Ensure `NEXTAUTH_URL=https://your-domain` and redeploy.

- **Meet add-on auth/link abuse protection (429)**  
  Wait for the short rate-limit window or reduce repeated rapid attempts.

## Validation Checklist

1. `npm run lint`
2. `npx prisma generate`
3. `npx prisma db push`
4. `npm run build`
5. Open `/meet-addon/panel` and verify:
   - login/link code works
   - poll submission works
   - shared to-do add/toggle works
   - leaderboard loads
