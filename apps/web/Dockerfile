FROM node:20-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @project-tracker/shared build
RUN pnpm --filter @project-tracker/web build
RUN pnpm deploy --filter @project-tracker/web --prod /prod

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json .
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
