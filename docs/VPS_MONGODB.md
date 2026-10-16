# NexRide MongoDB production runbook

NexRide requires replica-set transactions. The supplied configuration creates
an authenticated, loopback-only single-node replica set named `rs0` for a
single VPS. It supports transactions but is **not high availability**: a VPS or
disk failure takes the database offline. For higher availability, use a managed
replica set or at least three voting members in independent failure domains.
The local single-member template uses a protected keyfile for replica-set
membership. A multi-host production replica set should use the organization's
certificate lifecycle and MongoDB's X.509 member authentication instead.

Use the same supported MongoDB major version for production, backup tools, and
restore drills. Install MongoDB and the MongoDB Database Tools from MongoDB's
official repository for the VPS distribution; do not use an unofficial image
or an abandoned distribution package.

## 1. Secure and initialize the replica set

Back up the distribution configuration before replacing it. Generate the
internal membership key outside Git and restrict it to the `mongodb` account:

```bash
sudo cp /etc/mongod.conf /etc/mongod.conf.before-nexride
openssl rand -base64 756 | sudo tee /etc/mongodb-keyfile >/dev/null
sudo chown mongodb:mongodb /etc/mongodb-keyfile
sudo chmod 0400 /etc/mongodb-keyfile
sudo install -o root -g root -m 0644 /srv/nexride/deploy/mongodb/mongod.conf /etc/mongod.conf
sudo systemctl restart mongod
sudo systemctl status mongod --no-pager
mongosh --host 127.0.0.1 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
mongosh --host 127.0.0.1 --eval 'rs.status()'
```

Use the localhost exception immediately to create one offline break-glass
administrator. Then authenticate as that administrator and create:

- `nexride_app` on `admin`, with only `readWrite` on the `nexride` database.
- `nexride_backup` on `admin`, with only the built-in `backup` role.

Generate separate random passwords. Do not put passwords directly in command
arguments or shell history. For later `mongosh` connections, provide
`--username`, `--authenticationDatabase admin`, and a bare `--password` option
so the shell prompts without echoing it. Store the application URI only in
`/etc/nexride/backend.env`; percent-encode reserved URI characters in its
password.

For user creation, place the generated passwords in a temporary root-owned
environment file and read them from `process.env` in a reviewed `mongosh
--file` script; MongoDB documents environment variables specifically for
keeping secrets outside shell scripts. Remove the temporary file immediately
after both users authenticate successfully. Do not use `passwordPrompt()` for
this step because current `mongosh` releases do not support it in user-management
methods.

Verify access control and topology:

```bash
sudo ss -lntp | grep 27017
mongosh --host 127.0.0.1 --username nexride_app --authenticationDatabase admin --password --eval 'db.getSiblingDB("nexride").runCommand({ping:1})'
mongosh --host 127.0.0.1 --username nexride_app --authenticationDatabase admin --password --eval 'db.hello()'
```

Port 27017 must listen only on `127.0.0.1`. `db.hello()` must report `rs0` and a
writable primary. Never add a public UFW or provider-firewall rule for MongoDB.

## 2. Plan and apply indexes

The application never reconciles indexes during ordinary startup. Before each
release, load the protected environment file and review the exact plan:

```bash
cd /srv/nexride/backend
sudo -u nexride env PRODUCTION_ENV_FILE=/etc/nexride/backend.env npm run sync-indexes
```

Resolve every reported duplicate before continuing. Treat every planned index
drop as a schema migration requiring review. Apply only after a current backup:

```bash
sudo -u nexride env PRODUCTION_ENV_FILE=/etc/nexride/backend.env npm run sync-indexes -- --apply
```

Running the command without `--apply` never changes the database.

## 3. Install consistent nightly backups

Create a dedicated tools configuration using the example, replace its password,
and keep it readable only by root. The password is deliberately outside the URI
so it does not appear in process listings.

```bash
sudo install -d -o root -g root -m 0700 /var/backups/nexride/mongodb
sudo install -o root -g root -m 0600 /srv/nexride/deploy/mongodb/mongodump.yml.example /etc/nexride/mongodump.yml
sudo install -o root -g root -m 0755 /srv/nexride/deploy/mongodb/backup.sh /usr/local/sbin/nexride-mongodb-backup
sudo install -o root -g root -m 0644 /srv/nexride/deploy/systemd/nexride-mongodb-backup.service /etc/systemd/system/
sudo install -o root -g root -m 0644 /srv/nexride/deploy/systemd/nexride-mongodb-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexride-mongodb-backup.timer
sudo systemctl start nexride-mongodb-backup.service
sudo journalctl -u nexride-mongodb-backup.service -n 100 --no-pager
```

Each archive is compressed, checked for gzip integrity, checksummed, and made
consistent with `mongodump --oplog`. Fourteen days are retained locally. This
does not protect against total VPS loss: copy the archive and checksum to the
company's encrypted off-host backup storage after every successful run and
alert if either the timer or that transfer fails. Restrict backup access because
archives contain customer and commercial data.

## 4. Prove restoration

Install the restore verifier and run it at least monthly against an off-host
copy, using the same Database Tools version that created the archive:

```bash
sudo install -o root -g root -m 0755 /srv/nexride/deploy/mongodb/verify-restore.sh /usr/local/sbin/nexride-mongodb-verify-restore
sudo /usr/local/sbin/nexride-mongodb-verify-restore /var/backups/nexride/mongodb/nexride-TIMESTAMP.archive.gz
```

The verifier checks the SHA-256 file, restores with oplog replay into a temporary
MongoDB bound to `127.0.0.1:27018`, validates the core collections, shuts that
instance down, and removes its temporary data. It never connects to the
production URI. Record the date, archive name, tool versions, duration, and
result of every drill.
