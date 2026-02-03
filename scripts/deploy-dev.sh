#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found."
  echo ""
  echo "To set up staging deployment:"
  echo "  cp scripts/.env.example scripts/.env"
  echo ""
  echo "Then edit scripts/.env with your server details:"
  echo "  DEPLOY_SERVER    - SSH host alias or user@host (e.g., myserver)"
  echo "  DEPLOY_COMPOSE_DIR - Path to docker compose directory on the server (i.e. containing your yml file that already includes djjeck/webcatalog:dev)"
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

if [ -z "${DEPLOY_SERVER:-}" ] || [ -z "${DEPLOY_COMPOSE_DIR:-}" ]; then
  echo "Error: DEPLOY_SERVER and DEPLOY_COMPOSE_DIR must be set in scripts/.env"
  exit 1
fi

IMAGE="djjeck/webcatalog:dev"
TARBALL="${TMPDIR:-/tmp}/webcatalog-dev.tar"

cleanup() {
  rm -f "$TARBALL"
}
trap cleanup EXIT

echo "Building Docker image for linux/amd64..."
docker buildx build --platform linux/amd64 -t "$IMAGE" --load .

echo "Saving image to tarball..."
docker save -o "$TARBALL" "$IMAGE"
SIZE=$(du -h "$TARBALL" | cut -f1)
echo "Image saved ($SIZE)."

echo "Transferring image to $DEPLOY_SERVER..."
scp "$TARBALL" "$DEPLOY_SERVER:/tmp/webcatalog-dev.tar"

echo "Loading image on $DEPLOY_SERVER..."
ssh "$DEPLOY_SERVER" "docker load < /tmp/webcatalog-dev.tar && rm -f /tmp/webcatalog-dev.tar"

echo "Restarting service on $DEPLOY_SERVER..."
ssh "$DEPLOY_SERVER" "cd $DEPLOY_COMPOSE_DIR && docker compose up -d"

echo "Done. Image $IMAGE deployed to $DEPLOY_SERVER."
