#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Running database migrations..."
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

echo "==> Deployed successfully"
docker compose -f docker-compose.prod.yml ps
