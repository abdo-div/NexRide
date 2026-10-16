#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SOURCE_ROOT=/var/lib/nexride
BACKUP_ROOT=/var/backups/nexride/files
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ ! "$RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]]; then
  echo "RETENTION_DAYS must be a positive integer." >&2
  exit 1
fi

for command in tar gzip sha256sum find; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required backup command is unavailable: $command" >&2
    exit 1
  fi
done

for directory in public private; do
  if [[ ! -d "$SOURCE_ROOT/$directory" ]]; then
    echo "Persistent storage directory is missing: $SOURCE_ROOT/$directory" >&2
    exit 1
  fi
done

unsafe_entry="$(
  find "$SOURCE_ROOT/public" "$SOURCE_ROOT/private" -xdev \
    ! -type f ! -type d -print -quit
)"
if [[ -n "$unsafe_entry" ]]; then
  echo "Refusing to archive a link or special file: $unsafe_entry" >&2
  exit 1
fi

install -d -o root -g root -m 0700 "$BACKUP_ROOT"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$BACKUP_ROOT/nexride-files-$timestamp.tar.gz"
partial="$archive.partial"

cleanup() {
  rm -f -- "$partial"
}
trap cleanup EXIT

# Generated files are atomically renamed into place by the application. GNU
# tar still fails this job if a source changes while being read, so a partial
# or inconsistent archive is never promoted as a successful backup.
tar \
  --create \
  --gzip \
  --file "$partial" \
  --directory "$SOURCE_ROOT" \
  --numeric-owner \
  --acls \
  --xattrs \
  public private

gzip -t "$partial"
mv -- "$partial" "$archive"
sha256sum "$archive" > "$archive.sha256"

find "$BACKUP_ROOT" -maxdepth 1 -type f \
  -name 'nexride-files-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -type f \
  -name 'nexride-files-*.tar.gz.sha256' -mtime "+$RETENTION_DAYS" -delete

trap - EXIT
echo "Persistent file backup completed: $archive"

