# Persistent upload storage on the NexRide VPS

NexRide stores generated vehicle photos, customer avatars, and company branding
under `PUBLIC_STORAGE_DIR`. Partner identity and registration documents remain
under the separate `PRIVATE_STORAGE_DIR` and are only streamed through an
authorized API route. Neither directory belongs inside a Git checkout or a
versioned release directory.

The supplied single-VPS layout is:

- `/var/lib/nexride/public` — public generated media served by the API;
- `/var/lib/nexride/private` — protected partner documents;
- `/var/backups/nexride/files` — local nightly archives awaiting encrypted
  off-host replication.

## 1. Create persistent directories

```bash
sudo install -d -o nexride -g nexride -m 0750 /var/lib/nexride/public
sudo install -d -o nexride -g nexride -m 0750 /var/lib/nexride/public/vehicles
sudo install -d -o nexride -g nexride -m 0750 /var/lib/nexride/public/users
sudo install -d -o nexride -g nexride -m 0750 /var/lib/nexride/public/companies
sudo install -d -o nexride -g nexride -m 0750 /var/lib/nexride/private
```

Configure `/etc/nexride/backend.env`:

```dotenv
PUBLIC_STORAGE_DIR=/var/lib/nexride/public
PRIVATE_STORAGE_DIR=/var/lib/nexride/private
```

Production preflight rejects relative, missing, or overlapping roots. The
systemd unit grants the API write access only to these two persistent paths;
the release checkout stays read-only.

## 2. Migrate existing uploads once

Before switching from an in-place checkout deployment, stop writes and copy
only generated media. `--ignore-existing` avoids replacing a file already
migrated during a rehearsal:

```bash
sudo systemctl stop nexride
sudo rsync -a --ignore-existing /srv/nexride/backend/public/vehicles/ /var/lib/nexride/public/vehicles/
sudo rsync -a --ignore-existing /srv/nexride/backend/public/users/ /var/lib/nexride/public/users/
sudo rsync -a --ignore-existing /srv/nexride/backend/public/companies/ /var/lib/nexride/public/companies/
sudo chown -R nexride:nexride /var/lib/nexride/public /var/lib/nexride/private
sudo find /var/lib/nexride/public /var/lib/nexride/private -type d -exec chmod 0750 {} +
sudo find /var/lib/nexride/public /var/lib/nexride/private -type f -exec chmod 0640 {} +
sudo -u nexride env PRODUCTION_ENV_FILE=/etc/nexride/backend.env /usr/bin/node /srv/nexride/backend/scripts/validateProductionEnv.js
sudo systemctl start nexride
```

Verify an existing vehicle image, avatar, and company logo over HTTPS, then
upload one new image and confirm its file appears under `/var/lib/nexride/public`
rather than `/srv/nexride`. Private documents must never be reachable as static
URLs.

## 3. Install nightly backups

The backup is local first so the company can connect its chosen encrypted
off-host storage without putting provider credentials in this repository:

```bash
sudo install -d -o root -g root -m 0700 /var/backups/nexride/files
sudo install -o root -g root -m 0755 deploy/storage/backup.sh /usr/local/sbin/nexride-files-backup
sudo install -o root -g root -m 0755 deploy/storage/verify-backup.sh /usr/local/sbin/nexride-files-verify-backup
sudo install -o root -g root -m 0644 deploy/systemd/nexride-files-backup.service /etc/systemd/system/
sudo install -o root -g root -m 0644 deploy/systemd/nexride-files-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexride-files-backup.timer
sudo systemctl start nexride-files-backup.service
sudo journalctl -u nexride-files-backup.service -n 100 --no-pager
```

The job creates a gzip archive, validates it, writes a SHA-256 checksum, and
keeps 14 days by default. Configure the infrastructure backup agent to copy
both files to encrypted off-host storage after every successful run. Partner
documents contain sensitive personal and business data, so access to both the
local and remote backups must be restricted and audited.

## 4. Perform an isolated restore drill

At least monthly, verify the newest archive without writing into production:

```bash
sudo /usr/local/sbin/nexride-files-verify-backup \
  /var/backups/nexride/files/nexride-files-TIMESTAMP.tar.gz
```

The verifier checks the checksum, gzip stream, archive path safety, and required
directory layout, then extracts into a temporary `/var/tmp` directory and
removes it. Record the archive, date, size, duration, and result. Periodically
perform a full recovery on a disposable host and compare representative image
and private-document checksums before declaring disaster recovery tested.

