#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${PUBLIC_HOST:?Set PUBLIC_HOST in /etc/nexride/monitor.env}"
: "${ALERT_WEBHOOK_URL:?Set ALERT_WEBHOOK_URL in /etc/nexride/monitor.env}"

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
MONITORED_SERVICES="${MONITORED_SERVICES:-nginx nexride mongod redis-server}"
BACKUP_SERVICES="${BACKUP_SERVICES:-nexride-mongodb-backup.service nexride-files-backup.service}"
DISK_PATHS="${DISK_PATHS:-/ /var/lib/nexride /var/backups/nexride}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"
TLS_WARN_DAYS="${TLS_WARN_DAYS:-14}"
BACKUP_MAX_AGE_SECONDS="${BACKUP_MAX_AGE_SECONDS:-108000}"
ALERT_REPEAT_SECONDS="${ALERT_REPEAT_SECONDS:-3600}"
STATE_DIR="${STATE_DIR:-/var/lib/nexride-monitor}"
STATE_FILE="$STATE_DIR/state"

for value_name in DISK_WARN_PERCENT TLS_WARN_DAYS BACKUP_MAX_AGE_SECONDS ALERT_REPEAT_SECONDS; do
  value="${!value_name}"
  if [[ ! "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "$value_name must be a positive integer." >&2
    exit 2
  fi
done
if [[ ! "$PUBLIC_HOST" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "PUBLIC_HOST must be a DNS hostname without a scheme or path." >&2
  exit 2
fi
if [[
  "$ALERT_WEBHOOK_URL" != https://* ||
  "$ALERT_WEBHOOK_URL" == *$'\n'* ||
  "$ALERT_WEBHOOK_URL" == *$'\r'* ||
  "$ALERT_WEBHOOK_URL" == *'"'* ||
  "$ALERT_WEBHOOK_URL" == *\\*
]]; then
  echo "ALERT_WEBHOOK_URL must use HTTPS." >&2
  exit 2
fi

for command in curl systemctl df awk date openssl timeout hostname install; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required monitoring command is unavailable: $command" >&2
    exit 2
  fi
done

failures=()
add_failure() {
  failures+=("$1")
}

check_http() {
  local label="$1"
  local url="$2"
  if ! curl --fail --silent --show-error --max-time 10 --output /dev/null "$url"; then
    add_failure("$label failed: $url")
  fi
}

check_http "API liveness" "$API_BASE_URL/health/liveness"
check_http "API readiness" "$API_BASE_URL/health/readiness"

read -r -a services <<< "$MONITORED_SERVICES"
for service in "${services[@]}"; do
  if ! systemctl is-active --quiet "$service"; then
    add_failure("systemd service is not active: $service")
  fi
done

read -r -a disk_paths <<< "$DISK_PATHS"
for disk_path in "${disk_paths[@]}"; do
  if [[ ! -e "$disk_path" ]]; then
    add_failure("disk path is missing: $disk_path")
    continue
  fi
  usage="$(df -P "$disk_path" | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')"
  if [[ ! "$usage" =~ ^[0-9]+$ ]]; then
    add_failure("could not read disk usage: $disk_path")
  elif (( usage >= DISK_WARN_PERCENT )); then
    add_failure("disk usage is ${usage}% at $disk_path")
  fi
done

read -r -a backup_services <<< "$BACKUP_SERVICES"
now_epoch="$(date +%s)"
for service in "${backup_services[@]}"; do
  result="$(systemctl show "$service" --property=Result --value 2>/dev/null || true)"
  finished="$(systemctl show "$service" --property=ExecMainExitTimestamp --value 2>/dev/null || true)"
  if [[ "$result" != "success" || -z "$finished" || "$finished" == "n/a" ]]; then
    add_failure("backup has no successful run: $service")
    continue
  fi
  if ! finished_epoch="$(date -d "$finished" +%s 2>/dev/null)"; then
    add_failure("backup timestamp is unreadable: $service")
    continue
  fi
  if (( now_epoch - finished_epoch > BACKUP_MAX_AGE_SECONDS )); then
    add_failure("backup is stale: $service")
  fi
done

if certificate="$(
  timeout 10 openssl s_client \
    -servername "$PUBLIC_HOST" \
    -connect "$PUBLIC_HOST:443" </dev/null 2>/dev/null
)" && expiry_line="$(printf '%s' "$certificate" | openssl x509 -noout -enddate 2>/dev/null)"; then
  expiry_date="${expiry_line#notAfter=}"
  if expiry_epoch="$(date -d "$expiry_date" +%s 2>/dev/null)"; then
    seconds_left=$((expiry_epoch - now_epoch))
    if (( seconds_left < TLS_WARN_DAYS * 86400 )); then
      add_failure("TLS certificate expires within ${TLS_WARN_DAYS} days: $PUBLIC_HOST")
    fi
  else
    add_failure("TLS certificate expiry is unreadable: $PUBLIC_HOST")
  fi
else
  add_failure("TLS certificate could not be fetched: $PUBLIC_HOST")
fi

current_state="OK"
details="All monitored checks passed."
if (( ${#failures[@]} > 0 )); then
  current_state="FAIL"
  printf -v details '%s; ' "${failures[@]}"
  details="${details%; }"
fi

previous_state=""
previous_notified=0
if [[ -f "$STATE_FILE" ]]; then
  IFS='|' read -r previous_state previous_notified < "$STATE_FILE" || true
  [[ "$previous_notified" =~ ^[0-9]+$ ]] || previous_notified=0
fi

should_notify=false
if [[ -z "$previous_state" && "$current_state" == "FAIL" ]]; then
  should_notify=true
elif [[ -n "$previous_state" && "$current_state" != "$previous_state" ]]; then
  should_notify=true
elif [[ "$current_state" == "FAIL" ]] && (( now_epoch - previous_notified >= ALERT_REPEAT_SECONDS )); then
  should_notify=true
fi

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\r'/}"
  value="${value//$'\n'/\\n}"
  printf '%s' "$value"
}

notified_epoch="$previous_notified"
if [[ "$should_notify" == true ]]; then
  message="[NexRide][$current_state][$(hostname -s)] $details"
  payload="{\"text\":\"$(json_escape "$message")\"}"
  # Feed the secret-bearing URL through curl's stdin config so it is not
  # exposed in the process command line to other local users.
  if ! printf 'url = "%s"\n' "$ALERT_WEBHOOK_URL" | curl \
    --fail \
    --silent \
    --show-error \
    --max-time 15 \
    --header 'Content-Type: application/json' \
    --data-binary "$payload" \
    --config - \
    --output /dev/null; then
    echo "Alert delivery failed; state was not advanced so the next run retries." >&2
    exit 2
  fi
  notified_epoch="$now_epoch"
fi

install -d -m 0700 "$STATE_DIR"
temporary_state="$STATE_FILE.$$"
printf '%s|%s\n' "$current_state" "$notified_epoch" > "$temporary_state"
mv -- "$temporary_state" "$STATE_FILE"

echo "NexRide monitor state: $current_state - $details"
[[ "$current_state" == "OK" ]]

