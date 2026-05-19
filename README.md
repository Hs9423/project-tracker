# Project Tracker

Internal hierarchical team project tracker — manage projects, tasks, milestones, and team assignments across your organization.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, TypeScript, Prisma ORM
- **Database**: PostgreSQL 15
- **Cache / Queue**: Redis 7
- **Auth**: JWT (access + refresh tokens)
- **Real-time**: WebSockets (Socket.IO)
- **Email**: Nodemailer (SMTP)
- **Monorepo**: Turborepo + pnpm workspaces
- **Containerization**: Docker / Docker Compose
- **CI/CD**: GitHub Actions → AWS Lightsail

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose
- Git

## Local Dev Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd project-tracker

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env and fill in required values

# 4. Start infrastructure (Postgres + Redis)
docker compose up -d

# 5. Run database migrations
pnpm --filter api prisma migrate dev

# 6. Start all services in dev mode
pnpm dev
```

- Web app: http://localhost:3000
- API: http://localhost:3001
- API docs (Swagger): http://localhost:3001/api/docs

## Deployment

Deployment is automated via GitHub Actions on every push to `main`.

The workflow SSHs into the Lightsail instance and runs:
```bash
cd project-tracker
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `LIGHTSAIL_IP` | Public IP of the Lightsail instance |
| `SSH_PRIVATE_KEY` | Private SSH key for server access |

## Environment Variables

See [.env.example](.env.example) for the full list of required variables.

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password |
| `DATABASE_URL` | Full Postgres connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_EXPIRES_IN` | Access token expiry (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g. `7d`) |
| `REDIS_URL` | Redis connection URL |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `MAIL_FROM` | Sender email address |
| `FRONTEND_URL` | Frontend origin URL |
| `API_URL` | Backend API URL |
| `WS_URL` | WebSocket URL |
| `NEXT_PUBLIC_API_URL` | Public API URL (exposed to browser) |
| `NEXT_PUBLIC_WS_URL` | Public WebSocket URL (exposed to browser) |
