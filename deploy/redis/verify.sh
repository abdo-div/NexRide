#!/usr/bin/env bash
set -Eeuo pipefail

: "${REDIS_USERNAME:?Set REDIS_USERNAME to the NexRide ACL user}"
: "${REDISCLI_AUTH:?Set REDISCLI_AUTH to the Redis password}"

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

redis() {
  redis-cli --no-auth-warning \
    --host "$REDIS_HOST" \
    --port "$REDIS_PORT" \
    --user "$REDIS_USERNAME" \
    "$@"
}

info_value() {
  local payload="$1"
  local name="$2"
  printf '%s\n' "$payload" | tr -d '\r' | awk -F: -v key="$name" '$1 == key { print $2; exit }'
}

require_equal() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL: %s (expected %s, received %s)\n' "$label" "$expected" "${actual:-missing}" >&2
    exit 1
  fi
  printf 'PASS: %s\n' "$label"
}

require_equal "$(redis PING)" "PONG" "authenticated Redis ping"
require_equal "$(redis ACL WHOAMI)" "$REDIS_USERNAME" "named ACL identity"

persistence_info="$(redis INFO persistence)"
require_equal "$(info_value "$persistence_info" aof_enabled)" "1" "AOF persistence enabled"
require_equal "$(info_value "$persistence_info" aof_last_write_status)" "ok" "AOF writes healthy"
require_equal "$(info_value "$persistence_info" rdb_last_bgsave_status)" "ok" "RDB snapshots healthy"
require_equal "$(info_value "$persistence_info" loading)" "0" "dataset fully loaded"

memory_info="$(redis INFO memory)"
require_equal "$(info_value "$memory_info" maxmemory_policy)" "noeviction" "non-evicting queue policy"
maxmemory="$(info_value "$memory_info" maxmemory)"
if [[ ! "$maxmemory" =~ ^[1-9][0-9]*$ ]]; then
  printf 'FAIL: maxmemory must be a positive byte count (received %s)\n' "${maxmemory:-missing}" >&2
  exit 1
fi
printf 'PASS: maxmemory is bounded (%s bytes)\n' "$maxmemory"

probe_key="nexride:deployment:probe:$$"
require_equal "$(redis SET "$probe_key" ok EX 60)" "OK" "namespaced write"
require_equal "$(redis DEL "$probe_key")" "1" "namespaced cleanup"

if outside_result="$(redis SET "outside:deployment:probe:$$" denied EX 60 2>&1)"; then
  printf 'FAIL: ACL allowed a write outside the nexride namespace\n' >&2
  exit 1
fi
if [[ "$outside_result" != *NOPERM* ]]; then
  printf 'FAIL: outside-namespace probe failed for an unexpected reason\n' >&2
  exit 1
fi
printf 'PASS: writes outside the nexride namespace are denied\n'

printf 'Redis production verification passed.\n'
