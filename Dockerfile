# Build stage
FROM node:20-alpine AS builder
WORKDIR /app/backend

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/prisma.config.ts ./
COPY backend/prisma ./prisma
COPY backend/src ./src

RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache cairo pango libjpeg giflib librsvg

COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/index.js"]
