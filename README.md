# Let's Study — AI-Powered Collaborative Learning Platform

> India's cloud-native EdTech platform delivering structured virtual study sessions, intelligent progress analytics, and peer accountability for UPSC, JEE, NEET, and working professionals.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)](https://nextjs.org)
[![Deployed on Cloud Run](https://img.shields.io/badge/Cloud%20Run-asia--south1-4285F4?logo=googlecloud)](https://cloud.google.com/run)
[![Database](https://img.shields.io/badge/Cloud%20SQL-PostgreSQL-336791?logo=postgresql)](https://cloud.google.com/sql)
[![License](https://img.shields.io/badge/license-Private-red)](LICENSE)

---

## Overview

Let's Study is a full-stack EdTech web application built with Next.js 16 (App Router), deployed on Google Cloud Run with Cloud SQL as the managed data layer. The platform combines body-doubling methodology, Pomodoro session architecture, and an AI-powered progress engine to deliver measurable learning outcomes.

**Core capabilities:**
- Live virtual study rooms via Google Meet add-on (camera-on, mic-muted protocol)
- Real-time Pomodoro timer with automated session tracking
- AI-driven gamification — streaks, coin economy, and live leaderboard
- Subscription management with Razorpay payment integration
- WhatsApp notification system via Meta Cloud API
- Role-based access control (Admin, Staff, Student, Author, Influencer)
- Google Meet add-on (side panel + main stage) with live polls and quiz sync

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router, `output: standalone`) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **ORM** | Prisma 6 |
| **Authentication** | NextAuth v5 (Credentials + Google OAuth) |
| **Database** | PostgreSQL via Google Cloud SQL |
| **Hosting** | Google Cloud Run (asia-south1) |
| **Payments** | Razorpay |
| **Email** | Resend |
| **Messaging** | Meta WhatsApp Cloud API |
| **Rate Limiting** | Upstash Redis + Ratelimit |
| **Animation** | Framer Motion |
| **Charts** | Recharts |

---

## Cloud Architecture

See [CLOUD_ARCHITECTURE.md](./CLOUD_ARCHITECTURE.md) for the full Google Cloud infrastructure specification.

**Summary:**
- **Google Cloud Run** — Containerised, serverless deployment with auto-scaling to zero. Region: `asia-south1` (Mumbai).
- **Google Cloud SQL** — Managed PostgreSQL instance. Connected via Unix socket through Cloud SQL Auth Proxy inside the container.
- **Google Artifact Registry** — Container image registry for CI/CD pipeline.
- **Google Cloud Build** — Automated build and deploy pipeline triggered on push.
- **Google Load Balancer** — Global HTTPS load balancer with Serverless NEG routing to Cloud Run.
- **Google Meet Add-on** — Native add-on integration for live session panels and quiz synchronisation.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (local) or Google Cloud SQL instance
- A `.env` file configured from `.env.example`

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure the following:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/letsstudy"

# Authentication
AUTH_SECRET="your-32-char-minimum-secret"
AUTH_GOOGLE_ID="optional-google-oauth-client-id"
AUTH_GOOGLE_SECRET="optional-google-oauth-client-secret"

# Encryption (for sensitive AppSetting values)
ENCRYPTION_KEY="64-char-hex-key"

# Application
NEXT_PUBLIC_SITE_URL="https://lstudy.in"

# Payments
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""

# Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM=""

# WhatsApp (Meta Cloud API)
WHATSAPP_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_VERIFY_TOKEN=""

# Rate limiting (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

> **Security:** Never commit `.env` to version control. Rotate all secrets immediately if exposed.

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Run tracked migrations (production)
npx prisma migrate deploy
```

Migrations live under `prisma/migrations/`. If you see `The table public.AppSetting does not exist`, your `DATABASE_URL` points to a database that has no schema — run `db push` or `migrate deploy` on that database first.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For Turbopack (faster HMR):

```bash
npm run dev:turbo
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (webpack) |
| `npm run dev:turbo` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run create-admin` | Seed an admin user via script |

---

## Deployment

The application uses `output: "standalone"` for Docker/Cloud Run compatibility.

### Dockerfile (Production)

The production container:
1. Installs dependencies
2. Runs `npm run build`
3. Copies static assets into the standalone directory
4. Runs `npx prisma db push` at startup (via Cloud SQL Auth Proxy Unix socket)
5. Serves with `node server.js` from the standalone directory

### Cloud Run Environment Variables

Set via Cloud Run service configuration or Secret Manager:
- `DATABASE_URL` — Cloud SQL Unix socket format: `postgresql://user:pass@localhost/db?host=/cloudsql/PROJECT:REGION:INSTANCE`
- `PORT=8080`
- `HOSTNAME=0.0.0.0`
- All application secrets listed above

---

## Google Meet Add-on

The platform includes a native Google Meet add-on for in-session features.

**Features:**
- Side panel + main stage layout for session management
- Live poll and quiz synchronisation via Meet event bus (BroadcastChannel fallback in local dev)
- Focus guard with 20-20-20 eye-rest reminders and tab-away detection
- Pomodoro heartbeat endpoint for server-side session tracking
- Study Coins gamification ledger (coins awarded per session)
- Scholar leaderboard with streak + coin ranking

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/meet-addon/polls` | Fetch active polls for current session |
| POST | `/api/meet-addon/poll-response` | Submit poll response |
| GET/POST | `/api/meet-addon/today-task` | Read/write today's task |
| POST | `/api/meet-addon/focus/heartbeat` | Heartbeat for active session tracking |
| GET | `/api/meet-addon/leaderboard` | Leaderboard data |
| POST | `/api/meet-addon/login` | Authenticate add-on user |
| POST | `/api/meet-addon/link-with-code` | Link session with invite code |
| POST | `/api/meet-addon/link-code` | Generate link code |

---

## Troubleshooting

**Database does not exist**
Run `npx prisma db push` using the exact same `DATABASE_URL` your application uses.

**Missing auth secret (`MissingSecret`)**
Set `AUTH_SECRET` in your environment. Minimum 32 characters. Same value can be used for `NEXTAUTH_SECRET`.

**`next dev` lock error (`.next/dev/lock`)**
Stop all running Next.js processes before starting a new instance.

**Login callback URL issues in production**
Ensure `NEXTAUTH_URL=https://your-domain` is set and redeploy.

**Meet add-on rate limit (429)**
The link/auth endpoints have abuse protection. Wait for the rate-limit window to reset before retrying.

**Cloud Run: container failed to start**
Ensure `PORT=8080`, `HOSTNAME=0.0.0.0`, and the CMD runs `node server.js` from inside the `.next/standalone` directory.

---

## Validation Checklist

Before deploying to production:

- [ ] `npm run lint` — zero errors
- [ ] `npx prisma generate`
- [ ] `npx prisma db push` (or `migrate deploy`)
- [ ] `npm run build` — successful
- [ ] `/meet-addon/panel` — login, link code, poll submission, leaderboard all functional
- [ ] `/admin` — admin dashboard loads with correct data
- [ ] `/pricing` — pricing data loads from database
- [ ] Payment flow — Razorpay checkout opens and webhook processes correctly
- [ ] WhatsApp webhook — verify token handshake passes

---

## Contributing

This is a private repository. Contributions are by invitation only.

1. Create a feature branch from `main`
2. Follow existing code conventions (TypeScript strict, Tailwind utility classes)
3. Run `npm run lint` before committing
4. Submit a pull request with a clear description of changes

---

## License

Private and proprietary. All rights reserved. © Let's Study.
