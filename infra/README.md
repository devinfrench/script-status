# One-VM Deployment

This app is intended to run comfortably on a small Docker VM such as AWS Lightsail or a DigitalOcean Droplet.

## Basic Steps

1. Install Docker and the Docker Compose plugin.
2. Copy this repository to the VM.
3. Copy the example env files:

```bash
cp infra/env/backend.env.example infra/env/backend.env
cp infra/env/postgres.env.example infra/env/postgres.env
```

4. Edit passwords and public CORS origins in `infra/env/*.env`.
5. Create a project-root `.env` file with your Caddy hostname:

```env
SITE_DOMAIN=script-status.example.com
```

6. Start the production-style stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The production compose file exposes Caddy on ports `80` and `443`. Caddy terminates HTTPS for your configured domain and forwards traffic to the frontend container, which proxies `/api` to the backend container.

## TLS

HTTPS is handled by the Caddy service in `docker-compose.prod.yml` using `infra/reverse-proxy/Caddyfile`. Set `SITE_DOMAIN` to your production hostname, make sure that hostname has an `A` record pointing at the VPS, and allow inbound `80` and `443` through the VPS firewall.

## Backups

See `infra/postgres-backups.md` for simple `pg_dump` backup and restore commands.
