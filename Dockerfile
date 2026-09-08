FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV DOCKER=true
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/drizzle drizzle/
COPY --from=builder /app/drizzle.config.ts .
COPY package.json .

ENV NODE_ENV=production
ENV PORT=3000
# Allow uploads up to 50 MB (see MAX_UPLOAD_BYTES in src/lib/files.ts)
ENV BODY_SIZE_LIMIT=52428800

EXPOSE 3000

CMD ["sh", "-c", "npx drizzle-kit migrate && node build"]
