# PostgreSQL Backups

Create a compressed backup from the VM:

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

For low-cost hosting, schedule the backup command with cron and copy the dump to object storage or another machine.
