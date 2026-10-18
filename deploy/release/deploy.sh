#!/bin/sh
set -eu

archive=${1:-}
checksum=${2:-}
root=/srv/nexride
releases=$root/releases
current=$root/current
incoming=

fail() { echo "ERROR: $*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || fail "Run this script as root."
[ -f "$archive" ] || fail "Usage: deploy.sh RELEASE.tar.gz RELEASE.tar.gz.sha256"
[ -f "$checksum" ] || fail "Checksum file is missing."

archive=$(readlink -f "$archive")
checksum=$(readlink -f "$checksum")
archive_dir=$(dirname "$archive")
[ "$(awk 'NF != 2 { invalid = 1 } END { print NR ":" (invalid ? 1 : 0) }' "$checksum")" = "1:0" ] || \
  fail "Checksum file must contain exactly one SHA-256 entry."
expected_hash=$(awk '{ print $1 }' "$checksum")
expected_name=$(awk '{ print $2 }' "$checksum")
case "$expected_hash" in *[!0-9a-f]*|'') fail "Checksum is not lowercase SHA-256." ;; esac
[ "${#expected_hash}" -eq 64 ] || fail "Checksum is not 64 hexadecimal characters."
[ "$expected_name" = "$(basename "$archive")" ] || fail "Checksum names a different archive."
(cd "$archive_dir" && sha256sum -c "$checksum")

tar -tzf "$archive" | while IFS= read -r member; do
  case "/$member/" in *'/../'*|*'//'* ) fail "Unsafe archive path: $member" ;; esac
  case "$member" in RELEASE_SHA|backend/*|frontend/dist/*|deploy/*|docs/*) ;; *) fail "Unexpected archive path: $member" ;; esac
done
if tar -tvzf "$archive" | grep -q '^[^-d]'; then
  fail "Release archives may contain only regular files and directories."
fi

release_sha=$(tar -xOzf "$archive" RELEASE_SHA | tr -d '\r\n')
case "$release_sha" in *[!0-9a-f]*|'') fail "Invalid RELEASE_SHA metadata." ;; esac
[ "${#release_sha}" -eq 40 ] || fail "RELEASE_SHA must be a full commit SHA."

install -d -o root -g nexride -m 0750 "$root" "$releases"
target=$releases/$release_sha
[ ! -e "$target" ] || fail "Release $release_sha is already installed."
incoming=$releases/.incoming-$release_sha-$$
cleanup() {
  case "$incoming" in "$releases"/.incoming-*) rm -rf -- "$incoming" ;; esac
}
trap cleanup EXIT HUP INT TERM
install -d -o nexride -g nexride -m 0750 "$incoming"
tar -xzf "$archive" --no-same-owner --no-same-permissions -C "$incoming"
[ "$(cat "$incoming/RELEASE_SHA")" = "$release_sha" ] || fail "Extracted release metadata changed."
[ -f "$incoming/frontend/dist/index.html" ] || fail "Built frontend is missing from the release."
chown -R nexride:nexride "$incoming"

runuser -u nexride -- npm ci --omit=dev --prefix "$incoming/backend"
runuser -u nexride -- env PRODUCTION_ENV_FILE=/etc/nexride/backend.env \
  /usr/bin/node "$incoming/backend/scripts/validateProductionEnv.js"
chown -R root:nexride "$incoming"
chmod -R go-w "$incoming"
mv -- "$incoming" "$target"
incoming=

previous=
if [ -L "$current" ]; then
  previous=$(readlink "$current")
  case "$previous" in releases/*) ;; *) fail "Current release link points outside the managed release directory." ;; esac
fi
install -o root -g root -m 0644 "$target/deploy/systemd/nexride.service" \
  /etc/systemd/system/nexride.service
systemctl daemon-reload
systemctl enable nexride
next=$root/.current-$$
ln -s "releases/$release_sha" "$next"
mv -Tf "$next" "$current"

if systemctl restart nexride; then
  i=0
  while [ "$i" -lt 30 ]; do
    if curl --fail --silent --show-error http://127.0.0.1:3000/health/readiness >/dev/null; then
      echo "Release $release_sha is ready."
      exit 0
    fi
    i=$((i + 1))
    sleep 2
  done
fi

echo "New release failed readiness; restoring the previous release." >&2
if [ -n "$previous" ] && [ -d "$root/$previous" ]; then
  rollback_link=$root/.current-rollback-$$
  ln -s "$previous" "$rollback_link"
  mv -Tf "$rollback_link" "$current"
  install -o root -g root -m 0644 "$root/$previous/deploy/systemd/nexride.service" \
    /etc/systemd/system/nexride.service
  systemctl daemon-reload
  systemctl restart nexride || fail "The new release and automatic rollback both failed to start."
  fail "Deployment rolled back to $previous. Inspect journalctl -u nexride."
fi
fail "Deployment failed and no previous release exists. Keep Nginx out of service and inspect the journal."
