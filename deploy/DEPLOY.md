# Deploying Indish to a DigitalOcean Droplet

> **Scope:** this runbook covers `frontend/` + `backend/` only. The separate loyalty app
> (`../indish-loyalty`, TanStack Start SSR) isn't covered here yet — it has its own deployment
> story (Netlify Functions by default, per its own README). If you want it on this same droplet
> instead, that's a follow-up: it'd need its own PM2 process (SSR server, not a static build) and
> its own Nginx location block, plus a second MySQL database (`indish_loyalty`) alongside `indish`.

Target architecture:

```
Internet -> Nginx (80/443) -> React static build (dist/)
                            -> /api/* -> Express (PM2, 127.0.0.1:4000) -> Prisma -> MySQL
```

Tested against Ubuntu 22.04/24.04 droplets. Recommended minimum size: 2 GB RAM / 1 vCPU.

## 1. Server prep

```bash
ssh root@your.droplet.ip

apt update && apt upgrade -y
apt install -y curl git nginx mysql-server ufw

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

npm install -g pm2

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 2. MySQL

```bash
mysql_secure_installation

mysql -u root -p
```
```sql
CREATE DATABASE indish CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'indish_user'@'localhost' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON indish.* TO 'indish_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

MySQL only needs to listen on `localhost` — the app connects locally, and nothing external should
ever reach port 3306. Confirm `bind-address = 127.0.0.1` in `/etc/mysql/mysql.conf.d/mysqld.cnf`.

## 3. Get the code onto the droplet

```bash
mkdir -p /var/www/indish
cd /var/www/indish
# git clone <your-repo> .
# — or scp the restaurant-project/{frontend,backend} folders up —
```

Final layout expected by the configs in this `deploy/` folder:
```
/var/www/indish/
  frontend/   (this repo's frontend/)
  backend/    (this repo's backend/)
  deploy/     (this folder)
```

## 4. Backend

```bash
cd /var/www/indish/backend
npm ci
cp .env.example .env
nano .env   # DATABASE_URL, JWT_SECRET (openssl rand -base64 48), CORS_ORIGIN=https://indishzambia.com, WhatsApp Cloud API creds, etc.

npx prisma generate
npx prisma migrate deploy
SEED_ADMIN_PASSWORD="a-strong-password" npx prisma db seed

npm run build

mkdir -p /var/log/indish
pm2 start ../deploy/ecosystem.config.js --env production
pm2 save
pm2 startup   # run the command it prints, once
```

Sanity check: `curl http://127.0.0.1:4000/api/health` should return `{"status":"ok",...}`.

## 5. Frontend

```bash
cd /var/www/indish/frontend
npm ci
npm run build   # outputs dist/ — this is what Nginx serves
```

Set `VITE_API_URL=https://indishzambia.com/api` (or your domain) in `frontend/.env.production` before
building if the frontend's API base URL isn't already relative (`/api`) — relative is the default
and preferred, since it avoids CORS entirely on the deployed domain.

## 6. Nginx

```bash
cp /var/www/indish/deploy/nginx.conf /etc/nginx/sites-available/indish
ln -s /etc/nginx/sites-available/indish /etc/nginx/sites-enabled/indish
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Point your domain's A record at the droplet's IP before the next step.

## 7. SSL — Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d indishzambia.com -d www.indishzambia.com
```

Certbot edits the Nginx config in place to add the HTTPS server block and redirect HTTP -> HTTPS,
and sets up a renewal timer automatically (`systemctl status certbot.timer` to confirm).

## 8. Redeploying after changes

```bash
cd /var/www/indish
git pull   # or re-upload changed files

cd backend && npm ci && npx prisma migrate deploy && npm run build && pm2 restart indish-api
cd ../frontend && npm ci && npm run build
```

Nginx serves the frontend directly from `dist/`, so no restart is needed on the frontend side —
just a fresh `npm run build`.

## Operational notes

- Logs: `pm2 logs indish-api` (also written to `/var/log/indish/`).
- Backups: `mysqldump -u indish_user -p indish > backup-$(date +%F).sql` — put this on a cron job.
- Environment variables (`.env`) are never committed; `.env.example` documents what's required.
- `pm2 monit` for a live resource view; `pm2 status` for process health at a glance.
