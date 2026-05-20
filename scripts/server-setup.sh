#!/bin/bash
# One-time setup script for a fresh Ubuntu 22/24 Lightsail instance.
# Run this in the Lightsail browser SSH terminal:
#   bash <(curl -fsSL https://raw.githubusercontent.com/Hs9423/project-tracker/main/scripts/server-setup.sh)
# OR paste the entire file content directly into the browser SSH window.
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║   TeamTracker — Lightsail One-Time Setup     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. System updates ────────────────────────────────────────────────────────
echo "→ Updating system..."
sudo apt-get update -y -q
sudo apt-get upgrade -y -q

# ── 2. Install Docker ────────────────────────────────────────────────────────
echo "→ Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
# docker-compose v2 comes bundled with Docker as a plugin
sudo apt-get install -y -q docker-compose-plugin

# ── 3. Install git (usually pre-installed, but ensure it's there) ────────────
sudo apt-get install -y -q git

# ── 4. Generate SSH deploy key (GitHub Actions uses this to SSH in) ──────────
echo "→ Generating SSH deploy key..."
ssh-keygen -t ed25519 -C "github-actions@teamtracker" -f ~/.ssh/deploy_key -N ""

# Authorise the new key for incoming SSH connections from GitHub Actions
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Trust GitHub's host key so git pull doesn't prompt
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null

# ── 5. Clone the repository ──────────────────────────────────────────────────
echo "→ Cloning repository..."
git clone https://github.com/Hs9423/project-tracker.git /home/ubuntu/project-tracker

# ── 6. Create .env placeholder ───────────────────────────────────────────────
# You MUST fill in the real values before running docker compose up.
DB_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH=$(openssl rand -base64 32)

cat > /home/ubuntu/project-tracker/.env <<EOF
# ── Database ────────────────────────────────────────────────────────────────
DB_PASSWORD=${DB_PASS}
# NOTE: hostname is "postgres" (Docker service name), NOT localhost
DATABASE_URL=postgresql://pt_user:${DB_PASS}@postgres:5432/project_tracker

# ── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Redis (Docker service name) ───────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── Email (fill in your SMTP details) ────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=

# ── Public URLs ───────────────────────────────────────────────────────────────
# Replace 3.108.20.58 with your domain name once you have one.
FRONTEND_URL=http://3.108.20.58
NEXT_PUBLIC_API_URL=http://3.108.20.58/api
NEXT_PUBLIC_WS_URL=http://3.108.20.58
EOF

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ACTION REQUIRED — Follow these 3 steps before your first push  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "━━━  STEP 1: Add the PUBLIC KEY as a GitHub Deploy Key  ━━━━━━━━━━━"
echo "  Go to: https://github.com/Hs9423/project-tracker/settings/keys"
echo "  Click 'Add deploy key', title: 'Lightsail', Allow write access: NO"
echo "  Paste this key:"
echo ""
cat ~/.ssh/deploy_key.pub
echo ""
echo "━━━  STEP 2: Add the PRIVATE KEY to GitHub Actions Secrets  ━━━━━━━"
echo "  Go to: https://github.com/Hs9423/project-tracker/settings/secrets/actions"
echo "  Click 'New repository secret'"
echo ""
echo "  Secret name:  LIGHTSAIL_SSH_KEY"
echo "  Secret value: (the entire block below, including BEGIN and END lines)"
echo ""
cat ~/.ssh/deploy_key
echo ""
echo "  Also add:"
echo "  Secret name:  LIGHTSAIL_HOST"
echo "  Secret value: 3.108.20.58"
echo ""
echo "━━━  STEP 3: Verify/edit the .env file on the server  ━━━━━━━━━━━━━"
echo "  Passwords and secrets were auto-generated. Check/edit:"
echo "  nano /home/ubuntu/project-tracker/.env"
echo ""
echo "  Then do your FIRST manual deploy:"
echo "  cd /home/ubuntu/project-tracker"
echo "  docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "✓ Server setup complete!"
