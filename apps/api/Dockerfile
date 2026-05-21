FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium ca-certificates fonts-freefont-ttf \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @project-tracker/shared build
RUN cd apps/api && node_modules/.bin/prisma generate
RUN pnpm --filter @project-tracker/api build
RUN pnpm deploy --filter @project-tracker/api --prod /prod

FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium ca-certificates fonts-freefont-ttf \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install -g prisma@5.22.0

COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json .
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
RUN prisma generate

RUN mkdir -p exports
EXPOSE 3001
CMD ["sh", "-c", "prisma migrate deploy && node dist/src/main"]
