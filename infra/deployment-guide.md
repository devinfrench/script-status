# Production Deployment Guide

This app is designed to run on one small Docker VM, such as a DigitalOcean Droplet or AWS Lightsail Ubuntu instance.

## Recommended Setup

Use a single Ubuntu VM with Docker and Docker Compose installed. DigitalOcean is slightly simpler if you use their Docker 1-Click Droplet because it includes Docker Engine and Docker Compose. AWS Lightsail also works well, but you will usually install Docker yourself.

Open only these inbound ports:

```text
22   SSH
80   HTTP
443  HTTPS, once TLS is configured
```

Do not expose PostgreSQL publicly. The production compose file keeps Postgres internal to Docker, which is the intended setup.

## 1. Create The VM

Choose one:

- DigitalOcean Droplet with Ubuntu or the Docker 1-Click image.
- AWS Lightsail Ubuntu instance.

For the VM size, start small and scale up if needed. A low-cost instance is enough for this app unless session volume grows significantly.

## 2. Copy The Project To The Server

Recommended Git approach:

```bash
git init
git add .
git commit -m "Initial script status app"
```

Push the repo to GitHub, GitLab, or another Git host. Then SSH into the server and clone it:

```bash
cd /opt
git clone https://github.com/your-user/script-status.git
cd script-status
```

Direct copy approach:

```bash
scp -r ./script-status user@your-server-ip:/opt/script-status
```

Then SSH into the server:

```bash
ssh user@your-server-ip
cd /opt/script-status
```

## 3. Create Production Env Files

From the project root on the server:

```bash
cp infra/env/backend.env.example infra/env/backend.env
cp infra/env/postgres.env.example infra/env/postgres.env
```

Edit the Postgres env file:

```bash
nano infra/env/postgres.env
```

Use a strong password:

```env
POSTGRES_DB=script_status
POSTGRES_USER=script_status
POSTGRES_PASSWORD=your-strong-password
```

Edit the backend env file:

```bash
nano infra/env/backend.env
```

Use the same password in the database URL:

```env
DATABASE_URL=postgresql+psycopg://script_status:your-strong-password@db:5432/script_status
CORS_ORIGINS=["https://your-domain.com"]
```

If you are testing by IP before setting up a domain:

```env
CORS_ORIGINS=["http://your-server-ip"]
```

## 4. Start Production

From the project root on the server:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check container status:

```bash
docker compose -f docker-compose.prod.yml ps
```

View logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

The app should be available at:

```text
http://your-server-ip
```

The backend container runs Alembic migrations before starting the API.

## 5. Stop Or Update The App

Stop the app:

```bash
docker compose -f docker-compose.prod.yml down
```

Pull latest code and redeploy:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Do not use `down -v` in production unless you intentionally want to delete the Postgres volume.

## 6. Backups

Create a compressed database backup:

```bash
docker compose -f docker-compose.prod.yml exec -T db pg_dump \
  -U script_status \
  -d script_status \
  -Fc > script_status.dump
```

Restore into a clean database:

```bash
docker compose -f docker-compose.prod.yml exec -T db pg_restore \
  -U script_status \
  -d script_status \
  --clean \
  --if-exists < script_status.dump
```

Schedule backups with cron and copy them off the VM.

## 7. HTTPS

For production, use HTTPS. The repo includes example reverse proxy files in:

```text
infra/reverse-proxy/
```

The simplest future improvement is adding Caddy to `docker-compose.prod.yml` so it can automatically issue and renew TLS certificates.

## References

- Docker Compose install methods: https://docs.docker.com/compose/install/
- DigitalOcean Docker image: https://docs.digitalocean.com/products/marketplace/catalog/docker/
- DigitalOcean firewall rules: https://docs.digitalocean.com/products/networking/firewalls/how-to/configure-rules/
- AWS Lightsail firewall behavior: https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html
- AWS Lightsail HTTP/HTTPS firewall examples: https://docs.aws.amazon.com/en_us/lightsail/latest/userguide/amazon-lightsail-firewall-rules-reference.html
