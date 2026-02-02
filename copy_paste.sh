#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="dist"
DEST_DIR="C:\Users\garya\OneDrive\Documents\StoryLineOS\app\prod-v1"

error() {
  echo "[error] $1" >&2
}

info() {
  echo "[info] $1"
}

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
