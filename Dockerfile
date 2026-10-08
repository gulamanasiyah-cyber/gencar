FROM node:20-alpine AS base

# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json .npmrc* ./
RUN npm ci --legacy-peer-deps

# ============================================================
# Stage 2: Build the application
# ============================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# standalone output agar image sekecil mungkin
RUN npm run build

# ============================================================
# Stage 3: Production runner (minimal image)
# ============================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5315
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 5315

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5315/api/health 2>/dev/null || exit 1

CMD ["npm", "run", "start"]
