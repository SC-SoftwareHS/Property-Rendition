# RenditionReady — Deployment Guide

**Stack:** Next.js 15 + NestJS + PostgreSQL 16 on Hetzner CX32
**Domain:** renditionready.com (Cloudflare DNS + CDN)
**Cost:** ~$7.50/mo

---

## Prerequisites

- SSH key pair on your local machine (`~/.ssh/id_ed25519`)
- Cloudflare account with renditionready.com
- GitHub repo with the codebase pushed
- Clerk production instance created
- Stripe account with products configured

---

## 1. Provision the Hetzner Server

1. Sign up at [hetzner.com/cloud](https://hetzner.com/cloud)
2. Create a new project: **RenditionReady**
3. Add your SSH public key (Settings > SSH Keys > Add SSH Key)
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
4. Create server:
   - **Location:** Ashburn (lowest latency to TX/OK/FL customers)
   - **Image:** Ubuntu 24.04
   - **Type:** CX32 — 4 vCPU, 8 GB RAM, 80 GB disk ($7.50/mo)
   - **SSH Key:** select the key you added
   - **Name:** `renditionready-prod`
5. Copy the server IP address

---

## 2. Server Setup

### SSH in

```bash
ssh root@<HETZNER_IP>
```

### Install Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
docker --version
docker compose version
```

### Install Nginx

```bash
apt install -y nginx
rm /etc/nginx/sites-enabled/default
```

### Create Nginx config

```bash
nano /etc/nginx/sites-available/renditionready
```

Paste:

```nginx
server {
    listen 443 ssl;
    server_name renditionready.com www.renditionready.com;

    ssl_certificate /etc/cloudflare/origin.pem;
    ssl_certificate_key /etc/cloudflare/origin-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl;
    server_name api.renditionready.com;

    ssl_certificate /etc/cloudflare/origin.pem;
    ssl_certificate_key /etc/cloudflare/origin-key.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name renditionready.com www.renditionready.com api.renditionready.com;
    return 301 https://$host$request_uri;
}
```

Enable and test:

```bash
ln -s /etc/nginx/sites-available/renditionready /etc/nginx/sites-enabled/
nginx -t
```

> Don't reload Nginx yet — SSL certs aren't in place. That's next.

---

## 3. Cloudflare DNS + SSL

### DNS Records

In Cloudflare dashboard for renditionready.com, add:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `<HETZNER_IP>` | Proxied (orange cloud) |
| A | `api` | `<HETZNER_IP>` | Proxied (orange cloud) |
| A | `www` | `<HETZNER_IP>` | Proxied (orange cloud) |

### SSL Settings

- Go to **SSL/TLS** > set mode to **Full (Strict)**
- Go to **SSL/TLS > Origin Server > Create Certificate**
  - Hostnames: `renditionready.com`, `*.renditionready.com`
  - Validity: 15 years
  - Save the **Origin Certificate** and **Private Key**

### Install Origin Certificate on Server

```bash
mkdir -p /etc/cloudflare

nano /etc/cloudflare/origin.pem
# Paste the origin certificate

nano /etc/cloudflare/origin-key.pem
# Paste the private key

chmod 600 /etc/cloudflare/origin-key.pem
```

Now reload Nginx:

```bash
nginx -t && systemctl reload nginx
```

---

## 4. Deploy the Application

### Clone the repo

```bash
mkdir -p /opt
cd /opt
git clone git@github.com:<your-username>/property-rendition.git renditionready
cd renditionready
```

> If using HTTPS auth instead of SSH, use `https://github.com/...` and a personal access token.

### Generate Postgres password

```bash
openssl rand -base64 32
```

Save this — you'll use it in the next step.

### Create production .env

```bash
nano /opt/renditionready/.env
```

```env
# Database
POSTGRES_PASSWORD=<generated-password>
DATABASE_URL=postgresql://postgres:<generated-password>@postgres:5432/renditionready

# Clerk (production keys from clerk.com dashboard)
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Stripe (production keys from stripe.com dashboard)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# URLs
APP_URL=https://renditionready.com
NEXT_PUBLIC_API_URL=https://api.renditionready.com
ALLOWED_ORIGINS=https://renditionready.com
```

### Update docker-compose.prod.yml

The production compose file needs Postgres added. It should look like this:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: renditionready
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - '3001:3001'
    environment:
      PORT: 3001
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/renditionready
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
      CLERK_WEBHOOK_SECRET: ${CLERK_WEBHOOK_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      APP_URL: ${APP_URL}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    depends_on:
      - postgres
    restart: unless-stopped

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
    ports:
      - '3000:3000'
    environment:
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
    depends_on:
      - api
    restart: unless-stopped

volumes:
  pgdata:
```

### Build and start

```bash
cd /opt/renditionready
docker compose -f docker-compose.prod.yml up -d --build
```

Watch the build:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

First build takes 3-5 minutes. Wait for the API to show "Nest application successfully started."

---

## 5. Initialize the Database

```bash
# Run Drizzle migrations
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit push

# Seed reference data
docker compose -f docker-compose.prod.yml exec api npm run db:seed

# Seed depreciation tables
docker compose -f docker-compose.prod.yml exec api npm run seed:depreciation
```

---

## 6. Configure Webhooks

### Clerk

In Clerk dashboard > Webhooks, create endpoint:
- **URL:** `https://api.renditionready.com/webhooks/clerk`
- **Events:** `user.created`
- Copy the signing secret to `CLERK_WEBHOOK_SECRET` in `.env`

### Stripe

In Stripe dashboard > Developers > Webhooks, create endpoint:
- **URL:** `https://api.renditionready.com/webhooks/stripe`
- **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in `.env`

After updating `.env`, restart:

```bash
cd /opt/renditionready
docker compose -f docker-compose.prod.yml up -d
```

---

## 7. Verify Deployment

- [ ] `https://renditionready.com` loads the landing/login page
- [ ] `https://api.renditionready.com/health` returns 200 (or equivalent health endpoint)
- [ ] Sign up a test account via Clerk
- [ ] Complete a Stripe test checkout (use Stripe test mode first if needed)
- [ ] Generate a test PDF rendition

---

## 8. Backups

### Automated daily Postgres backup

```bash
mkdir -p /backups

cat > /opt/backup-db.sh << 'SCRIPT'
#!/bin/bash
CONTAINER=$(docker ps -qf "name=postgres")
if [ -z "$CONTAINER" ]; then
  echo "Postgres container not found" >&2
  exit 1
fi
docker exec "$CONTAINER" pg_dump -U postgres renditionready | gzip > "/backups/renditionready_$(date +%Y%m%d_%H%M%S).sql.gz"
find /backups -name "*.sql.gz" -mtime +14 -delete
SCRIPT

chmod +x /opt/backup-db.sh

# Add to cron — runs daily at 3 AM server time
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup-db.sh") | crontab -
```

### Manual backup

```bash
/opt/backup-db.sh
ls -lh /backups/
```

### Restore from backup

```bash
gunzip -c /backups/renditionready_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i $(docker ps -qf "name=postgres") psql -U postgres renditionready
```

---

## 9. GitHub Actions CI/CD

### Generate a deploy SSH key

On your local machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -N ""
```

Add the public key to the server:

```bash
ssh root@<HETZNER_IP> "cat >> ~/.ssh/authorized_keys" < ~/.ssh/github-deploy.pub
```

### Add GitHub Secrets

In your GitHub repo > Settings > Secrets and variables > Actions, add:

| Secret | Value |
|--------|-------|
| `HETZNER_HOST` | Your server IP |
| `HETZNER_SSH_KEY` | Contents of `~/.ssh/github-deploy` (the private key) |
| `NEXT_PUBLIC_API_URL` | `https://api.renditionready.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

### Deploy workflow

Update `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy
  cancel-in-progress: true

jobs:
  deploy:
    name: Deploy to Hetzner
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: root
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /opt/renditionready
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build
            docker image prune -f
```

Now every push to `main` auto-deploys.

---

## 10. Monitoring (Uptime Kuma)

```bash
docker run -d \
  --name uptime-kuma \
  --restart unless-stopped \
  -p 3002:3001 \
  louislam/uptime-kuma:1
```

Access at `http://<HETZNER_IP>:3002`, then add monitors:

- **HTTPS:** `https://renditionready.com` — check every 60s
- **HTTPS:** `https://api.renditionready.com/health` — check every 60s
- Set up email/SMS notifications for downtime

> Optional: proxy Uptime Kuma behind Nginx at `status.renditionready.com` if you want a public status page.

---

## Common Operations

### Redeploy manually

```bash
ssh root@<HETZNER_IP>
cd /opt/renditionready
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### View logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Single service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Restart a service

```bash
docker compose -f docker-compose.prod.yml restart api
```

### SSH tunnel for debugging (access Postgres locally)

```bash
ssh -L 5433:localhost:5432 root@<HETZNER_IP>
# Then connect locally: psql -h localhost -p 5433 -U postgres renditionready
```

> This won't work by default since Postgres isn't exposed to the host. If you need this, temporarily add `ports: ['127.0.0.1:5432:5432']` to the postgres service in docker-compose.prod.yml.

### Run database migrations after code changes

```bash
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit push
```

### Check disk usage

```bash
df -h
docker system df
```

### Clean up old Docker images

```bash
docker image prune -af
```

---

## Architecture Diagram

```
                    Internet
                       |
                  Cloudflare CDN
                  (DNS + SSL edge)
                       |
               Hetzner CX32 (Ashburn)
              ┌────────┴────────┐
              │     Nginx       │
              │  (reverse proxy │
              │  + origin SSL)  │
              └───┬─────────┬───┘
                  │         │
         :3000    │         │  :3001
    ┌─────────────┘         └─────────────┐
    │   Next.js 15                NestJS  │
    │   (web app)               (API)     │
    │                               │     │
    │                          ┌────┘     │
    │                          │          │
    │                   PostgreSQL 16     │
    │                   (Docker volume)   │
    └─────────────────────────────────────┘
              Docker Compose
```

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Hetzner CX32 | $7.50 |
| Cloudflare DNS + SSL + CDN | $0 |
| Clerk (free tier, 10K MAU) | $0 |
| Stripe | 2.9% + $0.30/txn |
| GitHub | $0 |
| **Total fixed** | **$7.50/mo** |
