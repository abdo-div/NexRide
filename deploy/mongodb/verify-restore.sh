#!/bin/sh
set -eu
umask 077

archive="${1:-}"
if [ -z "$archive" ] || [ ! -f "$archive" ]; then
  echo "Usage: $0 /absolute/path/to/nexride-TIMESTAMP.archive.gz" >&2
  exit 1
fi

archive=$(realpath "$archive")
checksum="$archive.sha256"
if [ ! -f "$checksum" ]; then
  echo "Matching checksum file is missing: $checksum" >&2
  exit 1
fi

for command in mongod mongorestore mongosh sha256sum; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required restore command is unavailable: $command" >&2
    exit 1
  fi
done

(
  cd "$(dirname "$archive")"
  sha256sum -c "$(basename "$checksum")"
)

work_dir=$(mktemp -d /var/tmp/nexride-mongodb-restore.XXXXXX)
db_path="$work_dir/data"
log_path="$work_dir/mongod.log"
mkdir -p "$db_path"

cleanup() {
  mongod --dbpath "$db_path" --shutdown >/dev/null 2>&1 || true
  case "$work_dir" in
    /var/tmp/nexride-mongodb-restore.*) rm -rf -- "$work_dir" ;;
    *) echo "Refusing to remove unexpected restore path: $work_dir" >&2 ;;
  esac
}
trap cleanup EXIT HUP INT TERM

# This isolated listener has no production URI, credentials, or data path. It
# exists only long enough to prove the archive can be replayed and validated.
mongod \
  --dbpath "$db_path" \
  --port 27018 \
  --bind_ip 127.0.0.1 \
  --fork \
  --logpath "$log_path"

mongorestore \
  --host 127.0.0.1 \
  --port 27018 \
  --archive="$archive" \
  --gzip \
  --oplogReplay \
  --objcheck

mongosh --quiet --host 127.0.0.1 --port 27018 --eval '
  const restored = db.getSiblingDB("nexride");
  const required = ["bookings", "companies", "payments", "users", "vehicles"];
  const collections = new Set(restored.getCollectionNames());
  const missing = required.filter((name) => !collections.has(name));
  if (missing.length) {
    print(`Restore verification failed; missing collections: ${missing.join(", ")}`);
    quit(2);
  }
  for (const name of required) {
    const result = restored.runCommand({ validate: name, full: false });
    if (!result.ok || result.valid === false) {
      print(`Restore verification failed for collection: ${name}`);
      quit(3);
    }
  }
  print("Restore verification passed for all core NexRide collections.");
'

echo "MongoDB restore drill completed without touching production."
