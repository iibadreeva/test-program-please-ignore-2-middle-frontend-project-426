# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder only for `next build` page collection — real URL comes at runtime.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
# NEXT_PUBLIC_* values are inlined into the client bundle by `next build`, so the
# Sentry DSN must be present at build time, not just at runtime.
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
# Optional: enables source map upload during the build.
ARG SENTRY_AUTH_TOKEN=""
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
RUN npx prisma generate
RUN npm run seed:build
RUN npm run build
# Isolated Prisma CLI tree for migrate/seed — versions match builder node_modules.
RUN PRISMA_VERSION="$(node -p "require('./node_modules/prisma/package.json').version")" \
  && CLIENT_VERSION="$(node -p "require('./node_modules/@prisma/client/package.json').version")" \
  && mkdir -p /prisma-tools \
  && cd /prisma-tools \
  && npm init -y \
  && npm install "prisma@${PRISMA_VERSION}" "@prisma/client@${CLIENT_VERSION}" --no-fund --no-audit \
  && cp -R /app/prisma /prisma-tools/prisma \
  && npx prisma generate --schema=prisma/schema.prisma \
  && npm cache clean --force

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apk add --no-cache libc6-compat openssl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /prisma-tools /prisma-tools

RUN chmod +x ./docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app /prisma-tools

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
