FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
