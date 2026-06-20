# Shared Dockerfile for every letstudy/* subdomain app.
# Build context must be the repo ROOT (not letstudy/<app>) — these apps
# depend on packages/shared, which npm workspaces only resolves from root.
#
# Build with:
#   docker build -f letstudy/Dockerfile --build-arg APP_DIR=home --build-arg NEXTAUTH_URL=https://home.lstudy.in -t lstudy-home .

ARG APP_DIR

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
ARG APP_DIR
ARG NEXTAUTH_URL

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma/
COPY packages ./packages/
COPY letstudy ./letstudy/
RUN npm ci

# Dummy build-time vars — prisma generate needs a DSN format but no live DB.
# Real values are injected at container runtime via env_file.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-placeholder-32-chars-minimum!"
ENV ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
ENV NEXTAUTH_URL=${NEXTAUTH_URL}

RUN npx prisma generate

# Droplet has 3.8GB RAM; Node's default heap ceiling (~2GB) OOMs on the
# larger apps' TypeScript check. Cap below physical RAM so it falls back
# to swap instead of getting OOM-killed.
ENV NODE_OPTIONS="--max-old-space-size=3072"

WORKDIR /app/letstudy/${APP_DIR}
RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
# next.config.ts has output:"standalone" + outputFileTracingRoot at repo root,
# so the standalone bundle mirrors the monorepo path (letstudy/<app>/server.js).
FROM node:20-alpine AS runner
ARG APP_DIR
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV APP_DIR=${APP_DIR}

COPY --from=builder /app/letstudy/${APP_DIR}/.next/standalone ./
COPY --from=builder /app/letstudy/${APP_DIR}/.next/static     ./letstudy/${APP_DIR}/.next/static
COPY --from=builder /app/letstudy/${APP_DIR}/public           ./letstudy/${APP_DIR}/public

EXPOSE 8080
CMD ["sh", "-c", "node letstudy/$APP_DIR/server.js"]
