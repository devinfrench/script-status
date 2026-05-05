#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"

usage() {
  cat <<'EOF'
Usage: bash infra/redeploy.sh [--pull]

Rebuild and restart the production Docker Compose stack.

Options:
  --pull    Run git pull before rebuilding.
  -h, --help
            Show this help text.
EOF
}

PULL_CODE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pull)
      PULL_CODE=true
      shift
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

if [[ "$PULL_CODE" == true ]]; then
  git pull --ff-only
fi

docker compose -f "$COMPOSE_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" ps
