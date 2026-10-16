# NexRide Nginx, TLS, and firewall setup

This runbook assumes Ubuntu, one public hostname, the Node service from
`VPS_NODE_SERVICE.md`, and a DNS `A`/`AAAA` record already pointing to the VPS.
Replace `nexride.example` below with the exact hostname used by `FRONTEND_URL`.
If the server has no working IPv6 route, remove the `listen [::]` lines and do
not publish an `AAAA` record.

## 1. Keep Node private

Set these values in `/etc/nexride/backend.env`, validate, and restart:

```dotenv
NODE_ENV=production
PORT=3000
BIND_HOST=127.0.0.1
FRONTEND_URL=https://nexride.example
FRONTEND_DOMAIN=https://nexride.example
```

```bash
sudo -u nexride env PRODUCTION_ENV_FILE=/etc/nexride/backend.env /usr/bin/node /srv/nexride/backend/scripts/validateProductionEnv.js
sudo systemctl restart nexride
sudo ss -lntp
```

The `node` listener must show `127.0.0.1:3000`, never `0.0.0.0:3000` or
`[::]:3000`.

## 2. Obtain the first certificate

Install Nginx and Certbot, create the ACME webroot, and render the bootstrap
configuration. Keep the placeholder template in Git; only the rendered copy in
`/etc/nginx` contains the real hostname.

```bash
sudo apt update
sudo apt install nginx certbot
sudo install -d -o www-data -g www-data -m 0755 /var/www/letsencrypt
export NEXRIDE_DOMAIN=nexride.example
sed "s/YOUR_DOMAIN/${NEXRIDE_DOMAIN}/g" /srv/nexride/deploy/nginx/nexride-bootstrap.conf | sudo tee /etc/nginx/sites-available/nexride >/dev/null
sudo ln -s /etc/nginx/sites-available/nexride /etc/nginx/sites-enabled/nexride
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/letsencrypt -d "${NEXRIDE_DOMAIN}"
```

If the site symlink already exists, do not recreate it. The bootstrap site
serves only ACME challenges and returns 503 for everything else, so HTTP is not
accidentally treated as the live application.

## 3. Enable the HTTPS reverse proxy

Render the final configuration, test it before reload, then verify renewal:

```bash
sed "s/YOUR_DOMAIN/${NEXRIDE_DOMAIN}/g" /srv/nexride/deploy/nginx/nexride.conf | sudo tee /etc/nginx/sites-available/nexride >/dev/null
sudo install -o root -g root -m 0755 /srv/nexride/deploy/certbot/reload-nginx.sh /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run --run-deploy-hooks
systemctl list-timers | grep certbot
```

The proxy preserves the real client IP and HTTPS scheme for Express, accepts
the application's largest supported multipart upload, uses TLS 1.2/1.3, and
adds HSTS only on HTTPS responses. Its access log excludes query strings and
password-reset token paths.

## 4. Enable the host firewall without losing SSH

First confirm the actual SSH port and keep the current SSH session open. Replace
`22` below if the server uses another port. If the company has a fixed office or
VPN address, restricting SSH to that source is safer than allowing it globally.

```bash
sudo ss -lntp
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw limit 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw show added
sudo ufw enable
sudo ufw status verbose
```

Mirror the same policy in the VPS provider firewall/security group: public TCP
80 and 443, SSH only from an approved source where possible, and no public
rules for 3000, 27017, or 6379. Do not enable UFW until the displayed SSH rule
matches the port used by the active connection.

## 5. External release checks

Run these from a different machine, not from the VPS:

```bash
curl --fail --head http://nexride.example/
curl --fail https://nexride.example/health/liveness
curl --fail https://nexride.example/health/readiness
```

The HTTP request must redirect to the fixed HTTPS hostname. Both HTTPS health
checks must return 200 before users are sent to the site. Also verify that a
connection to public port 3000 is refused and review:

```bash
sudo journalctl -u nexride -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/nexride.error.log
```
