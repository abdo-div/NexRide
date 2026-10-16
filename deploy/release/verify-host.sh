#!/bin/sh
set -u

expected_sha=${1:-}
public_url=${2:-}
root=/srv/nexride
current=$root/current
failures=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; failures=$((failures + 1)); }

check_command() {
  label=$1
  shift
  if "$@" >/dev/null 2>&1; then pass "$label"; else fail "$label"; fi
}

check_equal() {
  label=$1
  actual=$2
  expected=$3
  if [ "$actual" = "$expected" ]; then
    pass "$label"
  else
    fail "$label (expected '$expected', got '$actual')"
  fi
}

check_nonempty() {
  label=$1
  actual=$2
  if [ -n "$actual" ]; then pass "$label"; else fail "$label"; fi
}

case "$expected_sha" in *[!0-9a-f]*|'') echo "Usage: verify-host.sh FULL_RELEASE_SHA https://public-domain" >&2; exit 2 ;; esac
[ "${#expected_sha}" -eq 40 ] || { echo "Release SHA must contain all 40 characters." >&2; exit 2; }
case "$public_url" in https://*) ;; *) echo "Public URL must be an HTTPS origin." >&2; exit 2 ;; esac
public_host=${public_url#https://}
case "$public_host" in ''|*/*|*:*|*[!A-Za-z0-9.-]*) echo "Public URL must be an HTTPS origin on port 443 without a path." >&2; exit 2 ;; esac
[ "$(id -u)" -eq 0 ] || { echo "Run as root so protected configuration can be validated." >&2; exit 2; }

printf 'NexRide host verification\nRelease: %s\nOrigin:  %s\n\n' "$expected_sha" "$public_url"

if [ -L "$current" ]; then
  current_link=$(readlink "$current")
  check_equal "Current symlink selects expected release" "$current_link" "releases/$expected_sha"
else
  fail "Current release is an atomic symlink"
fi

metadata=
[ -f "$current/RELEASE_SHA" ] && metadata=$(tr -d '\r\n' < "$current/RELEASE_SHA")
check_equal "Release metadata matches expected SHA" "$metadata" "$expected_sha"

node_major=$(/usr/bin/node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)
check_equal "Node.js major version is 24" "$node_major" "24"

env_permissions=$(stat -c '%a:%U:%G' /etc/nexride/backend.env 2>/dev/null || true)
check_equal "Backend environment is root-owned and group-readable" "$env_permissions" "640:root:nexride"
check_command "Production environment preflight passes" runuser -u nexride -- env \
  PRODUCTION_ENV_FILE=/etc/nexride/backend.env /usr/bin/node \
  "$current/backend/scripts/validateProductionEnv.js"

check_command "NexRide service is enabled" systemctl is-enabled --quiet nexride.service
check_command "NexRide service is active" systemctl is-active --quiet nexride.service
service_user=$(systemctl show nexride.service --property=User --value 2>/dev/null || true)
check_equal "NexRide service runs as dedicated user" "$service_user" "nexride"
working_directory=$(systemctl show nexride.service --property=WorkingDirectory --value 2>/dev/null || true)
check_equal "NexRide service runs from current release" "$working_directory" "/srv/nexride/current/backend"

check_command "Nginx configuration is valid" /usr/sbin/nginx -t
check_command "Nginx is active" systemctl is-active --quiet nginx.service
check_command "MongoDB is active" systemctl is-active --quiet mongod.service
check_command "Redis is active" systemctl is-active --quiet redis-server.service

check_command "MongoDB backup timer is active" systemctl is-active --quiet nexride-mongodb-backup.timer
check_command "File backup timer is active" systemctl is-active --quiet nexride-files-backup.timer
check_command "Host monitor timer is active" systemctl is-active --quiet nexride-monitor.timer
check_equal "Latest MongoDB backup job succeeded" "$(systemctl show nexride-mongodb-backup.service --property=Result --value 2>/dev/null || true)" "success"
check_equal "Latest file backup job succeeded" "$(systemctl show nexride-files-backup.service --property=Result --value 2>/dev/null || true)" "success"
check_equal "Latest monitor job succeeded" "$(systemctl show nexride-monitor.service --property=Result --value 2>/dev/null || true)" "success"
check_nonempty "MongoDB backup has run at least once" "$(systemctl show nexride-mongodb-backup.service --property=ExecMainStartTimestamp --value 2>/dev/null || true)"
check_nonempty "File backup has run at least once" "$(systemctl show nexride-files-backup.service --property=ExecMainStartTimestamp --value 2>/dev/null || true)"
check_nonempty "Host monitor has run at least once" "$(systemctl show nexride-monitor.service --property=ExecMainStartTimestamp --value 2>/dev/null || true)"

check_command "Public upload storage is writable by the app" runuser -u nexride -- test -w /var/lib/nexride/public
check_command "Private upload storage is writable by the app" runuser -u nexride -- test -w /var/lib/nexride/private
if runuser -u nexride -- test -w "$current/backend/server.js"; then
  fail "Release source is read-only to the app user"
else
  pass "Release source is read-only to the app user"
fi

check_command "Local liveness passes" curl --fail --silent --show-error http://127.0.0.1:3000/health/liveness
check_command "Local readiness passes" curl --fail --silent --show-error http://127.0.0.1:3000/health/readiness
check_command "Public liveness passes over TLS" curl --fail --silent --show-error --proto '=https' --tlsv1.2 "$public_url/health/liveness"
check_command "Public readiness passes over TLS" curl --fail --silent --show-error --proto '=https' --tlsv1.2 "$public_url/health/readiness"
check_command "TLS certificate remains valid for at least 14 days" sh -c \
  "openssl s_client -connect '$public_host:443' -servername '$public_host' </dev/null 2>/dev/null | openssl x509 -checkend 1209600 -noout"

redirect=$(curl --silent --show-error --output /dev/null --write-out '%{http_code} %{redirect_url}' "http://$public_host/" 2>/dev/null || true)
check_equal "HTTP redirects to the fixed HTTPS origin" "$redirect" "301 $public_url/"

printf '\n'
if [ "$failures" -eq 0 ]; then
  printf 'HOST VERIFIED: all automated checks passed for %s.\n' "$expected_sha"
  printf 'Human acceptance, real payment/refund, restore drill, and authenticated smoke evidence are still required.\n'
  exit 0
fi

printf 'NO-GO: %s automated host check(s) failed.\n' "$failures" >&2
exit 1
