#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
DOTENV_FILE="$PROJECT_ROOT/.env"

usage() {
  cat <<'EOF'
Usage: bash infra/redeploy.sh [--pull] [--site-domain DOMAIN]

Rebuild and restart the production Docker Compose stack.

Options:
  --pull    Run git pull before rebuilding.
  --site-domain DOMAIN
            Public hostname Caddy should use for HTTPS.
  -h, --help
            Show this help text.

You can also provide SITE_DOMAIN as an environment variable:

  SITE_DOMAIN=script-status.example.com bash infra/redeploy.sh

Or define it once in a project-root .env file:

  SITE_DOMAIN=script-status.example.com
EOF
}

read_dotenv_value() {
  local key="$1"
  local file="$2"
  local value

  value="$(grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- || true)"
  if [[ "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

PULL_CODE=false
SITE_DOMAIN_VALUE="${SITE_DOMAIN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pull)
      PULL_CODE=true
      shift
      ;;
    --site-domain)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "--site-domain requires a domain value" >&2
        usage >&2
        exit 2
      fi
      SITE_DOMAIN_VALUE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

cd "$PROJECT_ROOT"

if [[ -z "$SITE_DOMAIN_VALUE" ]]; then
  if [[ -f "$DOTENV_FILE" ]]; then
    SITE_DOMAIN_VALUE="$(read_dotenv_value SITE_DOMAIN "$DOTENV_FILE")"
  fi
fi

if [[ -z "$SITE_DOMAIN_VALUE" ]]; then
  echo "SITE_DOMAIN is required. Pass --site-domain DOMAIN, set SITE_DOMAIN=DOMAIN, or add SITE_DOMAIN to .env." >&2
  exit 2
fi

export SITE_DOMAIN="$SITE_DOMAIN_VALUE"

if [[ "$PULL_CODE" == true ]]; then
  git pull --ff-only
fi

docker compose -f "$COMPOSE_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" ps
