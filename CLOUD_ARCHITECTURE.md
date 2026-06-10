# Cloud Architecture — Let's Study

> **Prepared for:** Google Cloud for Startups Application
> **Platform:** Let's Study (`lstudy.in`)
> **Last Updated:** June 2026

---

## Overview

Let's Study is a cloud-native EdTech platform that delivers AI-powered collaborative study sessions to UPSC, JEE, NEET aspirants and working professionals across India. The platform is built entirely on Google Cloud infrastructure, leveraging serverless compute, managed database services, Gemini AI capabilities, and the Google Meet Add-on SDK. Every architectural decision is optimised for the Indian learner base — low-latency delivery from Mumbai (`asia-south1`), cost-efficient auto-scaling for exam-season traffic spikes, and a data residency model that keeps all user data within India's geographic boundaries.

---

## Current Google Cloud Stack

### Google Cloud Run — Serverless Application Layer

Let's Study's core application is deployed as a containerised Next.js 16 service on Google Cloud Run in the `asia-south1` (Mumbai) region. Cloud Run's serverless execution model provides automatic scaling from zero to peak load without manual provisioning — critical for an EdTech platform where traffic spikes sharply during exam preparation seasons (UPSC prelims, JEE mains, NEET UG). The container is built using Docker with `output: standalone` mode, statically linked assets, and a startup script that runs Prisma schema migrations before the server process begins. All Cloud Run revisions are deployed through Google Cloud Build, triggered on every push to the production branch via Artifact Registry.

**Key configuration:**
- Region: `asia-south1` (Mumbai)
- Container: Node.js 20 Alpine, ~180MB compressed image
- Startup command: `npx prisma db push && cd /app/.next/standalone && node server.js`
- Ingress: Google Load Balancer (HTTPS) → Serverless NEG → Cloud Run

### Google Cloud SQL — Managed Data Layer

All application data — user accounts, session records, streak analytics, subscription state, coin transactions, and platform configuration — is stored in a PostgreSQL 15 instance on Google Cloud SQL (`library-489819:asia-south1:letsstudy`). The database connects to the Cloud Run service via Unix socket through the Cloud SQL Auth Proxy, which is embedded in the container at runtime. This eliminates TCP exposure entirely — the database has no public IP, and all connections are authenticated via service account credentials. Automated daily backups with 7-day point-in-time recovery are enabled. The Prisma ORM manages all schema migrations with tracked migration files under version control.

**Key configuration:**
- Engine: PostgreSQL 15
- Connection: Unix socket (`/cloudsql/library-489819:asia-south1:letsstudy`)
- Auth: Cloud SQL Auth Proxy + IAM service account
- Backups: Daily automated, 7-day PITR retention

### Gemini API via Vertex AI — StudyMate AI Assistant

StudyMate is the platform's AI-powered study assistant, integrated directly into the learning session experience. It is built on the Gemini API, accessed via the Vertex AI endpoint. StudyMate answers subject-specific questions, explains complex concepts in multiple learning styles, summarises session material, and surfaces relevant practice resources — all within Pomodoro break windows so it augments rather than interrupts focused study time. Access is gated behind the platform's coin economy (each query deducts coins, aligned to the learner's subscription plan), with Upstash Redis enforcing per-user rate limits to prevent API abuse. The AI provider configuration (API key, model version, system prompt) is managed through the admin dashboard at `/admin/ai-settings`, enabling hot-swapping of providers without redeployment.

**Key configuration:**
- Provider: Gemini API (primary) via Vertex AI
- Rate limiting: Upstash Redis + `@upstash/ratelimit`
- Access control: Coin-gated, plan-based feature flag
- Admin interface: `/admin/ai-settings` (hot-configurable)

### Google Meet Add-on API — Live Study Session Layer

The platform's core value proposition — peer-accountable, structured study sessions — is delivered through a native Google Meet Add-on built with the `@googleworkspace/meet-addons` SDK. The add-on provides a side panel interface for Pomodoro timer management, live polls, and quiz synchronisation, and a main stage experience for session-wide focus coordination. Real-time event synchronisation between participants uses the Meet Add-on Event Bus, with a BroadcastChannel API fallback for local development environments. Session heartbeat events are posted to `/api/meet-addon/focus/heartbeat` every 30 seconds, which drives the streak calculation and coin award engine. The add-on authenticates users via a unique link code flow that binds the Meet session identity to the platform account.

**Key configuration:**
- SDK: `@googleworkspace/meet-addons` v1.2
- Endpoints: 8 REST endpoints under `/api/meet-addon/`
- Heartbeat interval: 30 seconds per active participant
- Fallback: BroadcastChannel API (local dev)

### Firebase — Real-Time Presence and Notifications *(Active Integration)*

Firebase Realtime Database is used for live session presence tracking — displaying the count of active learners in a study room in real time without polling the primary database. Firebase Cloud Messaging (FCM) handles push notifications for streak reminders, session slot alerts, and coin reward events. The lightweight Firebase client SDK is loaded asynchronously to avoid blocking the critical rendering path. Firebase is the preferred choice for this layer due to its sub-100ms latency for presence events and its native integration with the Google Cloud identity and billing ecosystem.

---

## Scalability Design

Let's Study's architecture is designed to handle the non-linear traffic patterns inherent to exam-cycle EdTech. Daily peaks occur between 18:00–23:00 IST (evening study blocks), and seasonal spikes coincide with UPSC, JEE, and NEET preparation calendars. Google Cloud Run's per-request auto-scaling handles this without configuration — instances spin up within 500ms and scale to zero during off-peak hours, reducing infrastructure cost by approximately 60–70% compared to reserved-capacity alternatives. The Cloud SQL connection pool is managed by Prisma with a maximum of 10 concurrent connections per Cloud Run instance, preventing database saturation during scale events. Upstash Redis provides a distributed rate-limiting layer that operates independently of the database, protecting all public-facing API endpoints from traffic surges and abuse without adding latency to the primary request path.

---

## AI/ML Pipeline — StudyMate

The StudyMate AI pipeline is designed as a stateless, session-scoped request-response system. When a learner submits a query, the request passes through the rate limiter (Upstash Redis), the coin balance validator (Cloud SQL), and the context assembler — which injects the learner's current subject, active Pomodoro session context, and recent task list into the system prompt. The enriched prompt is then sent to the Gemini API via Vertex AI. Responses stream back to the client via Server-Sent Events for real-time display, eliminating the latency of waiting for a full response before rendering. Each successful query deducts the configured coin amount from the learner's balance and writes a transaction record to the audit ledger. Usage statistics (query count, token consumption, error rates) are aggregated per-user and visible in the admin AI usage dashboard at `/admin/ai-usage`, enabling cost monitoring and provider optimisation without third-party tooling.

---

## Security and Compliance

| Layer | Control |
|---|---|
| **Transport** | HTTPS enforced via Google Load Balancer SSL termination (TLS 1.3) |
| **Authentication** | NextAuth v5 — bcrypt-hashed credentials (cost factor 12), optional Google OAuth |
| **Sensitive configuration** | AES-256 encryption at rest in `AppSetting` table; `ENCRYPTION_KEY` stored as Cloud Run environment variable |
| **API rate limiting** | Upstash Redis-backed distributed rate limiter on all public endpoints |
| **Database access** | Cloud SQL private connectivity only — Unix socket, no public IP, IAM service account auth |
| **Payment data** | Razorpay PCI-DSS certified infrastructure — no raw card data touches Let's Study servers |
| **Data residency** | All user data stored exclusively in Google Cloud `asia-south1` (Mumbai, India) |
| **Regulatory compliance** | DPDP Act 2023 (India) — privacy policy, data deletion endpoints, and consent flows implemented |
| **SOC 2 Type II** | Compliance audit in progress — expected completion Q4 2026 |
| **Secrets management** | Cloud Run environment variables (migration to Google Secret Manager planned Q3 2026) |

---

## Planned Infrastructure — Next 12 Months

### Google BigQuery — Learning Analytics Data Warehouse
As the learner base scales, session-level analytics (attendance patterns, focus duration distributions, drop-off points, cohort retention curves) will be streamed from Cloud SQL to BigQuery via Cloud Datastream. This enables SQL-based exploration of multi-week learning trajectories at a scale that transactional databases cannot support efficiently. Coaching centre partners will have access to a read-only BigQuery dataset powering their institutional dashboards, replacing the current Cloud SQL-backed analytics queries with sub-second aggregations over millions of session records.

### Vertex AI — Custom Model Fine-Tuning
The StudyMate assistant's current Gemini API integration will be augmented with a fine-tuned model trained on India-specific competitive exam content — UPSC GS papers, JEE previous year questions, and NEET biology/chemistry problem sets. Training data will be curated from the platform's blog and user-contributed session notes, processed through the Vertex AI dataset pipeline, and evaluated using precision metrics against a held-out exam question set. A fine-tuned model is expected to improve subject accuracy by 30–40% compared to the base Gemini model for domain-specific queries.

### Google Cloud CDN — Global Content Delivery
Study material assets (PDFs, planners, notes) currently served from Cloud Storage without CDN will be fronted by Google Cloud CDN. This reduces P95 download latency for learners outside Mumbai from ~800ms to under 80ms, directly improving conversion on the digital store. CDN cache policies will be configured per asset type — immutable assets (versioned PDFs) cached indefinitely; dynamic pricing and availability data bypasses cache entirely.
