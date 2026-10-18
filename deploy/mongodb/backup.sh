#!/bin/sh
set -eu
umask 077

BACKUP_ROOT=/var/backups/nexride/mongodb
TOOLS_CONFIG=/etc/nexride/mongodump.yml
RETENTION_DAYS="${NEXRIDE_MONGODB_RETENTION_DAYS:-14}"

case "$RETENTION_DAYS" in
  ''|*[!0-9]*)
    echo "NEXRIDE_MONGODB_RETENTION_DAYS must be a positive integer." >&2
    exit 1
    ;;
esac

if [ "$RETENTION_DAYS" -lt 1 ]; then
  echo "NEXRIDE_MONGODB_RETENTION_DAYS must be at least 1." >&2
  exit 1
fi

if [ ! -r "$TOOLS_CONFIG" ]; then
  echo "MongoDB tools configuration is missing or unreadable: $TOOLS_CONFIG" >&2
  exit 1
fi

for command in mongodump gzip sha256sum; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required backup command is unavailable: $command" >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_ROOT"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$BACKUP_ROOT/nexride-$timestamp.archive.gz"
partial="$archive.partial"

cleanup() {
  rm -f -- "$partial"
}
trap cleanup EXIT HUP INT TERM

# --oplog captures writes that occur during the dump, producing a consistent
# replica-set backup that can later be restored with --oplogReplay.
mongodump \
  --config="$TOOLS_CONFIG" \
  --archive="$partial" \
  --gzip \
  --oplog

test -s "$partial"
gzip -t "$partial"
mv -- "$partial" "$archive"
(
  cd "$BACKUP_ROOT"
  sha256sum "$(basename "$archive")" >"$(basename "$archive").sha256"
)

# Retention only targets archives created by this script in its fixed backup
# directory. Their matching checksum files are removed at the same time.
find "$BACKUP_ROOT" -maxdepth 1 -type f \
  -name 'nexride-*.archive.gz' -mtime "+$RETENTION_DAYS" \
  -exec sh -c 'for archive do rm -f -- "$archive" "$archive.sha256"; done' sh {} +

echo "MongoDB backup completed: $archive"
