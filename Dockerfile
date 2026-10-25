# Gencar — wadah aplikasi Next.js 14 (Node.js 20).
# Database: Turso (libSQL) cloud — TIDAK di dalam wadah ini.
# Build standalone agar image sekecil mungkin & CPU minimal.
FROM node:20-alpine AS base

# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json .npmrc* ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# ============================================================
# Stage 2: Build the application (standalone output)
# ============================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Dummy JWT_SECRET untuk lolos validasi saat build (tidak dipakai saat runtime)
ARG JWT_SECRET="build-time-placeholder-secret-not-for-production-use!!"

# next.config.mjs sudah memiliki output: 'standalone'
RUN JWT_SECRET="${JWT_SECRET}" npm run build

# ============================================================
# Stage 3: Production runner (minimal image)
# ============================================================
FROM base AS runner

# tini: meneruskan sinyal berhenti & membereskan proses anak.
RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3102 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Jakarta

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build (sudah termasuk node_modules yang diperlukan)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Pastikan modul @libsql (termasuk native musl) tetap tersedia
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql

USER nextjs
EXPOSE 3102

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3102/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
