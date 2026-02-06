#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="dist"
ENVIRONMENT="${1:-}"

error() {
  echo "[error] $1" >&2
}

info() {
  echo "[info] $1"
}

usage() {
  echo "Usage: $0 <dev|staging|prod>" >&2
}

if [ -z "$ENVIRONMENT" ]; then
  error "Missing environment."
  usage
  exit 1
fi

case "${ENVIRONMENT,,}" in
  dev)
    DEST_DIR="c:/Users/garya/OneDrive/Documents/StoryLineOS/VMF-APP/release-v1/DEV-client-v1"
    ;;
  staging)
    DEST_DIR="c:/Users/garya/OneDrive/Documents/StoryLineOS/VMF-APP/release-v1/STAGING-client-v1"
    ;;
  prod)
    DEST_DIR="c:/Users/garya/OneDrive/Documents/StoryLineOS/VMF-APP/release-v1/PROD-client-v1"
    ;;
  *)
    error "Unknown environment '$ENVIRONMENT'."
    usage
    exit 1
    ;;
esac

if [ ! -d "$SRC_DIR" ]; then
  error "Source directory '$SRC_DIR' does not exist."
  exit 1
fi

if [ ! -d "$DEST_DIR" ]; then
  error "Destination directory '$DEST_DIR' does not exist."
  exit 1
fi

info "Clearing destination: $DEST_DIR"
# Remove existing files/directories in destination (but keep the destination folder itself).
rm -rf "${DEST_DIR:?}"/*

info "Copying from $SRC_DIR to $DEST_DIR"
cp -a "$SRC_DIR"/. "$DEST_DIR"/

info "Copy complete."
