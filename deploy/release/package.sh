#!/bin/sh
set -eu

repository=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
output=${1:-"$repository/release-output"}
release_sha=${2:-$(git -C "$repository" rev-parse HEAD)}

case "$release_sha" in
  *[!0-9a-f]*|'') echo "Release SHA must contain only lowercase hexadecimal characters." >&2; exit 1 ;;
esac
[ "${#release_sha}" -eq 40 ] || { echo "Release SHA must be the full 40-character commit SHA." >&2; exit 1; }
git -C "$repository" cat-file -e "$release_sha^{commit}"
git -C "$repository" diff --quiet
git -C "$repository" diff --cached --quiet
[ -f "$repository/frontend/dist/index.html" ] || { echo "frontend/dist is missing; run the frontend build first." >&2; exit 1; }

stage=$(mktemp -d)
cleanup() { rm -rf -- "$stage"; }
trap cleanup EXIT HUP INT TERM

git -C "$repository" archive "$release_sha" backend deploy docs | tar -xf - -C "$stage"
mkdir -p "$stage/frontend"
cp -R "$repository/frontend/dist" "$stage/frontend/dist"
printf '%s\n' "$release_sha" > "$stage/RELEASE_SHA"

mkdir -p "$output"
archive="$output/nexride-$release_sha.tar.gz"
tar --sort=name --mtime="@${SOURCE_DATE_EPOCH:-0}" --owner=0 --group=0 --numeric-owner \
  -czf "$archive" -C "$stage" RELEASE_SHA backend frontend deploy docs
(
  cd "$output"
  sha256sum "$(basename "$archive")" > "$(basename "$archive").sha256"
)
cp "$repository/deploy/release/deploy.sh" "$output/deploy.sh"
cp "$repository/deploy/release/rollback.sh" "$output/rollback.sh"
printf 'Created %s and its SHA-256 checksum.\n' "$archive"
