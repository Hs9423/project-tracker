# TeamTracker

Internal hierarchical team project tracker — manage projects, tasks, milestones, time logs, and team assignments across your organization. Includes real-time notifications, rich comment threads, and exportable analytics reports.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7 + BullMQ |
| Auth | JWT (access + refresh tokens) |
| Real-time | Socket.IO |
| Email | Nodemailer (SMTP) |
| PDF Export | Puppeteer |
| Monorepo | Turborepo + pnpm workspaces |
| Containers | Docker / Docker Compose |
| CI/CD | GitHub Actions → AWS Lightsail |

## Prerequisites

- **Node.js** 20+
- **pnpm** (`npm install -g pnpm`)
- **Docker Desktop** (local) or **Docker** (server)
- **Git**

## Local Development

```bash
# 1. Clone the repository
git clone <repo-url>
cd project-tracker

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env — at minimum set DB_PASSWORD and JWT_SECRET

# 3. Start infrastructure (Postgres + Redis)
docker compose up -d

# 4. Install dependencies
pnpm install

# 5. Run database migrations
pnpm --filter @project-tracker/api exec prisma migrate dev

# 6. Seed initial data (admin user + sample data)
pnpm --filter @project-tracker/api exec prisma db seed

# 7. Start all services in watch mode
pnpm dev

# 8. Open the app
open http://localhost:3000
```

**Default login:** `admin@company.com` / `Admin@123`

- Web app: http://localhost:3000
- API: http://localhost:3001

## AWS Lightsail Deployment

```bash
# 1. SSH into your Lightsail instance
ssh -i your-key.pem ubuntu@<lightsail-ip>

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Clone the repository
git clone <repo-url> project-tracker
cd project-tracker

# 4. Copy and fill environment variables
cp .env.example .env
nano .env   # fill DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, SMTP_*, FRONTEND_URL, NEXT_PUBLIC_API_URL

# 5. Make scripts executable
chmod +x deploy.sh backup.sh

# 6. Deploy
./deploy.sh

# App is now running at http://<lightsail-ip>
```

### Manual deploy / update

```bash
./deploy.sh        # git pull + docker build + migrate
./backup.sh        # pg_dump → backup_YYYYMMDD_HHMMSS.sql
```

## GitHub Actions Automated Deployment

On every push to `main`, the workflow SSHs into the Lightsail instance and runs `./deploy.sh`.

### Required secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `LIGHTSAIL_IP` | Public IP of your Lightsail instance |
| `SSH_PRIVATE_KEY` | Content of the `.pem` private key file |

Example workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Lightsail
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.LIGHTSAIL_IP }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd project-tracker
            ./deploy.sh
```

## Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `DB_PASSWORD` | PostgreSQL password |
| `DATABASE_URL` | Full connection string (auto-built from `DB_PASSWORD` in docker-compose) |
| `JWT_SECRET` | Secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) |
| `JWT_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `REDIS_HOST` | Redis hostname (`redis` in Docker, `localhost` locally) |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (usually `587`) |
| `SMTP_USER` | SMTP username / email address |
| `SMTP_PASS` | SMTP password or app password |
| `MAIL_FROM` | From address for notifications |
| `FRONTEND_URL` | Frontend origin (for CORS and email links) |
| `NEXT_PUBLIC_API_URL` | API base URL exposed to the browser |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL exposed to the browser |

## Project Structure

```
project-tracker/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── comments/
│   │   │   ├── notifications/
│   │   │   ├── reports/       # Phase 6: analytics + exports
│   │   │   └── jobs/          # BullMQ processors
│   │   └── prisma/
│   └── web/          # Next.js 14 frontend
│       └── src/
│           ├── app/(app)/
│           │   ├── dashboard/
│           │   ├── projects/
│           │   ├── my-work/
│           │   ├── reports/   # Phase 6
│           │   ├── admin/
│           │   └── notifications/
│           ├── components/
│           ├── hooks/
│           └── store/
├── packages/
│   └── shared/       # Shared TypeScript types
├── docker-compose.yml          # Local dev (Postgres + Redis only)
├── docker-compose.prod.yml     # Production (all services + Nginx)
├── nginx.conf
├── deploy.sh
└── backup.sh
```

## Features

- **Hierarchical org chart** — users report to managers; tasks/projects cascade visibility
- **Projects** — status, priority, tags, assignments with visibility engine
- **Tasks** — nested subtasks, dependencies, Kanban board, Gantt timeline
- **Time logs** — per-task time tracking with weekly timesheet view
- **Comments** — threaded replies, @mention autocomplete, emoji reactions, real-time sync
- **Notifications** — in-app + email, due-date and overdue reminders via BullMQ cron
- **Reports** — project progress, team productivity, time tracking, workload (PDF + CSV export)
- **Admin** — user management, org chart editor
