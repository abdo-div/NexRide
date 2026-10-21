#!/bin/sh
set -eu

release_sha=${1:-}
root=/srv/nexride
releases=$root/releases
current=$root/current

fail() { echo "ERROR: $*" >&2; exit 1; }
wait_for_readiness() {
  attempts=${1:-30}
  i=0
  while [ "$i" -lt "$attempts" ]; do
    if curl --fail --silent --show-error --max-time 5 \
      http://127.0.0.1:3000/health/readiness >/dev/null; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}
[ "$(id -u)" -eq 0 ] || fail "Run this script as root."
case "$release_sha" in *[!0-9a-f]*|'') fail "Usage: rollback.sh FULL_RELEASE_SHA" ;; esac
[ "${#release_sha}" -eq 40 ] || fail "Use the full 40-character release SHA."
target=$releases/$release_sha
[ -d "$target" ] || fail "Release $release_sha is not installed."
[ "$(cat "$target/RELEASE_SHA")" = "$release_sha" ] || fail "Release metadata does not match the directory."

previous=$(readlink "$current")
case "$previous" in releases/*) ;; *) fail "Current release link is not managed." ;; esac
runuser -u nexride -- env PRODUCTION_ENV_FILE=/etc/nexride/backend.env \
  /usr/bin/node "$target/backend/scripts/validateProductionEnv.js"

install -o root -g root -m 0644 "$target/deploy/systemd/nexride.service" \
  /etc/systemd/system/nexride.service
systemctl daemon-reload
next=$root/.current-rollback-$$
ln -s "releases/$release_sha" "$next"
mv -Tf "$next" "$current"

if systemctl restart nexride && wait_for_readiness 30; then
  echo "Rollback to $release_sha is ready."
  exit 0
fi

restore=$root/.current-restore-$$
ln -s "$previous" "$restore"
mv -Tf "$restore" "$current"
install -o root -g root -m 0644 "$root/$previous/deploy/systemd/nexride.service" \
  /etc/systemd/system/nexride.service
systemctl daemon-reload
if systemctl restart nexride && wait_for_readiness 30; then
  fail "Rollback target failed readiness; the original release is healthy and restored at $previous."
fi
fail "Rollback target and original release both failed readiness. Keep Nginx out of service and inspect journalctl -u nexride."
