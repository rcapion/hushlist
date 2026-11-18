# Hushlist as a container: docs/HOSTING.md.
#
#   docker build -t hushlist .
#   docker build --target test .        # typecheck and tests only
#
# The data (SQLite, pictures, the backup copy) lives in /data, a volume. The
# app runs as the image's `node` user (uid 1000), so /data must be writable by
# that uid.

# Pinned by digest: a tag alone changes without a rebuild.
FROM node:22.23.2-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS deps
WORKDIR /app
# Fallback toolchain for better-sqlite3 if its prebuilt binary is ever missing.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22.23.2-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS test
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run typecheck && npm test

FROM node:22.23.2-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Keeps a stray database out of the image if a build ever touches one.
ENV HUSHLIST_DB_PATH=/tmp/build-only.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The font (next/font) is downloaded here, so the build needs the internet.
RUN npm run build

FROM node:22.23.2-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS runner
WORKDIR /app
# ca-certificates: fetching product pages. tzdata: dates in HUSHLIST_TIMEZONE.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    HUSHLIST_DB_PATH=/data/hushlist.db
# Standalone omits static/ and public/; without these two the page is unstyled.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Optional: the commit this image is built from, shown by /api/health.
ARG RELEASE=""
RUN if [ -n "$RELEASE" ]; then echo "$RELEASE" > RELEASE; fi \
 && mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
# No curl in the slim image; node is the one tool it is sure to have.
HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
# node, not npm: npm does not forward SIGTERM, so SQLite never shuts down cleanly.
CMD ["node", "server.js"]
