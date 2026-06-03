# Deploying State Side Global → shopstatesideglobal.com

Production stack on a Hostinger KVM VPS (Ubuntu + Docker). Three containers,
fronted by Caddy which terminates HTTPS automatically.

```
Internet ──443──▶ Caddy (web)  ──/api/*──▶ server (Express :4000) ──▶ mongo :27017
                     │  /*  (React SPA static files)                    (volume)
```

Same-origin design: the SPA and the API share `shopstatesideglobal.com`, so the
httpOnly auth cookies work with no CORS/cross-site cookie issues.

---

## 1. DNS (do this first — TLS issuance needs it)

In your domain's DNS, point the apex + www at the VPS public IP:

| Type | Name | Value          |
|------|------|----------------|
| A    | `@`  | `<VPS_IP>`     |
| A    | `www`| `<VPS_IP>`     |

Wait for propagation (`dig shopstatesideglobal.com +short` returns the VPS IP).
Caddy cannot get a certificate until DNS resolves to the server.

## 2. Harden the server (SSH in as root once)

```bash
adduser deploy && usermod -aG sudo deploy        # non-root sudo user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy your SSH key
# Edit /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no
systemctl restart ssh

# Firewall: allow SSH + web only
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

apt update && apt install -y fail2ban
```

Docker + Compose are already present (you enabled Hostinger's Docker manager).
Verify: `docker --version && docker compose version`. If missing:
`curl -fsSL https://get.docker.com | sh`.

## 3. Get the code onto the server

```bash
sudo mkdir -p /opt/shopstatesideglobal && sudo chown deploy:deploy /opt/shopstatesideglobal
git clone https://github.com/JaninduHK/shopstatesideglobal.git /opt/shopstatesideglobal
cd /opt/shopstatesideglobal
```

## 4. Configure secrets

```bash
cp .env.example .env
# generate strong secrets:
openssl rand -base64 48   # -> JWT_ACCESS_SECRET
openssl rand -base64 48   # -> JWT_REFRESH_SECRET
openssl rand -base64 32   # -> MONGO_PASS (use the SAME value in MONGODB_URI)
nano .env
```

Fill in: `MONGO_USER`/`MONGO_PASS` (and the matching `MONGODB_URI`), JWT secrets,
`ADMIN_EMAIL`, `ADMIN_SETUP_SECRET`, and your **Cloudinary** values.
Leave **Paystack** and **SendGrid** blank for now (not ready) — payments and
emails will be inactive until you add them.

## 5. Build & launch

```bash
docker compose up -d --build
docker compose ps          # all three should be "running"/"healthy"
docker compose logs -f server
```

Caddy auto-fetches a Let's Encrypt cert on first boot (needs ports 80/443 open
and DNS pointing here). Then visit **https://shopstatesideglobal.com**.

Smoke test:
```bash
curl https://shopstatesideglobal.com/health     # {"status":"ok","env":"production"}
```

## 6. Seed the admin / initial data (if applicable)

```bash
docker compose exec server node seeders/index.js     # if you want seed data
```
(Or use your `ADMIN_SETUP_SECRET` flow to promote the first admin account.)

## 7. Before opening to real customers

- [ ] Add **LIVE** Paystack keys + plan codes to `.env`, then
      `docker compose up -d --build` (rebuild bakes `VITE_PAYSTACK_PUBLIC_KEY` into the SPA).
- [ ] In the **Paystack dashboard**, set the webhook URL to
      `https://shopstatesideglobal.com/api/v1/membership/paystack-webhook`
      and put the signing secret in `PAYSTACK_WEBHOOK_SECRET`.
- [ ] Add `SENDGRID_API_KEY` (+ verify your sender domain in SendGrid).
- [ ] Place a real test order end-to-end (membership → checkout → email).

## 8. Operate

```bash
# Backups (self-hosted Mongo — you own these):
chmod +x scripts/backup-mongo.sh
crontab -e
#   0 3 * * * /opt/shopstatesideglobal/scripts/backup-mongo.sh >> /var/log/ssg-backup.log 2>&1

# Deploy an update:
git pull && docker compose up -d --build

# Logs / restart:
docker compose logs -f
docker compose restart server
```

## Updating after changing env vars

- Server-only vars (JWT, Mongo, Paystack secret, SendGrid): `docker compose up -d server`
- Client/Vite vars (`VITE_*`): must rebuild → `docker compose up -d --build web`
