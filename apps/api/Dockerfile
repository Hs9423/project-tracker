FROM node:20-alpine AS builder
WORKDIR /app
# Puppeteer dependencies for PDF export
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install -g pnpm
COPY . .
RUN pnpm install
# Generate Prisma client so all DB types are available before nest build
RUN cd apps/api && node_modules/.bin/prisma generate
RUN pnpm --filter @project-tracker/api build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  openssl
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
# Install prisma CLI globally so migrations can run at startup
RUN npm install -g prisma@5.22.0
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json .
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p exports
EXPOSE 3001
CMD ["sh", "-c", "prisma migrate deploy && node dist/src/main"]
