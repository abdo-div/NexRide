#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /var/backups/nexride/files/nexride-files-TIMESTAMP.tar.gz" >&2
  exit 64
fi

archive="$(realpath -e -- "$1")"
checksum="$archive.sha256"

if [[ ! -f "$checksum" ]]; then
  echo "Checksum file is missing: $checksum" >&2
  exit 1
fi

(cd "$(dirname "$archive")" && sha256sum -c "$(basename "$checksum")")
gzip -t "$archive"

while IFS= read -r member; do
  normalized="${member#./}"
  if [[ "$normalized" == /* || "$normalized" == ".." || "$normalized" == ../* || "$normalized" == */.. || "$normalized" == */../* ]]; then
    echo "Unsafe archive member: $member" >&2
    exit 1
  fi
  if [[ "$normalized" != public && "$normalized" != public/* && "$normalized" != private && "$normalized" != private/* ]]; then
    echo "Unexpected archive member: $member" >&2
    exit 1
  fi
done < <(tar -tzf "$archive")

while IFS= read -r listing; do
  entry_type="${listing:0:1}"
  if [[ "$entry_type" != "-" && "$entry_type" != "d" ]]; then
    echo "Archive contains a link or special file: $listing" >&2
    exit 1
  fi
done < <(tar -tvzf "$archive")

restore_root="$(mktemp -d /var/tmp/nexride-files-restore.XXXXXX)"
cleanup() {
  case "$restore_root" in
    /var/tmp/nexride-files-restore.*) rm -rf -- "$restore_root" ;;
    *) echo "Refusing to remove unexpected path: $restore_root" >&2 ;;
  esac
}
trap cleanup EXIT

tar \
  --extract \
  --gzip \
  --file "$archive" \
  --directory "$restore_root" \
  --no-same-owner \
  --no-same-permissions

for directory in public private; do
  if [[ ! -d "$restore_root/$directory" ]]; then
    echo "Archive does not contain required directory: $directory" >&2
    exit 1
  fi
done

echo "Persistent file backup verified without touching production storage."
