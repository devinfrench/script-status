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
5. Start the production-style stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The production compose file exposes the frontend on port `80`. The frontend container proxies `/api` to the backend container.

## TLS

For HTTPS, put Caddy or nginx in front of the stack. A Caddy example is in `infra/reverse-proxy/Caddyfile.example`.

## Backups

See `infra/postgres-backups.md` for simple `pg_dump` backup and restore commands.
