import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryDir = path.resolve(backendDir, "..");
const readDeploymentFile = (...parts) =>
  fs.readFileSync(path.join(repositoryDir, "deploy", ...parts), "utf8");

const nginx = readDeploymentFile("nginx", "nexride.conf");
const bootstrap = readDeploymentFile("nginx", "nexride-bootstrap.conf");
const renewalHook = readDeploymentFile("certbot", "reload-nginx.sh");
const serverSource = fs.readFileSync(path.join(backendDir, "server.js"), "utf8");

test("the bootstrap virtual host exposes only ACME challenges", () => {
  assert.match(bootstrap, /location \^~ \/\.well-known\/acme-challenge\//);
  assert.match(bootstrap, /location \/ \{\s*return 503;/s);
  assert.doesNotMatch(bootstrap, /proxy_pass|listen 443/);
});

test("HTTP redirects to a fixed HTTPS host instead of reflecting Host", () => {
  assert.match(nginx, /return 301 https:\/\/YOUR_DOMAIN\$request_uri;/);
  assert.doesNotMatch(nginx, /return 30[18] https:\/\/\$host/);
});

test("TLS terminates with modern protocols and HSTS", () => {
  assert.match(nginx, /listen 443 ssl http2;/);
  assert.match(nginx, /ssl_protocols TLSv1\.2 TLSv1\.3;/);
  assert.match(nginx, /ssl_session_cache shared:NexRideSSL:10m;/);
  assert.match(nginx, /Strict-Transport-Security "max-age=31536000" always;/);
});

test("Nginx proxies only to the loopback Node listener with trusted headers", () => {
  assert.match(nginx, /server 127\.0\.0\.1:3000;/);
  assert.match(nginx, /proxy_set_header Host \$host;/);
  assert.match(nginx, /proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/);
  assert.match(nginx, /proxy_set_header X-Forwarded-Proto https;/);
  assert.match(serverSource, /app\.listen\(PORT, BIND_HOST,/);
});

test("edge limits admit supported uploads without unbounded proxy waits", () => {
  assert.match(nginx, /client_max_body_size 48m;/);
  assert.match(nginx, /proxy_connect_timeout 5s;/);
  assert.match(nginx, /proxy_read_timeout 60s;/);
  assert.match(nginx, /proxy_request_buffering on;/);
});

test("access logs omit query strings and sensitive reset-token paths", () => {
  const format = nginx.match(/log_format nexride_safe ([\s\S]*?);/)?.[0] ?? "";
  assert.match(format, /\$request_method \$uri \$server_protocol/);
  assert.doesNotMatch(format, /\$request(?:_uri)?\b/);
  assert.match(nginx, /reset\(\?:-\|\[Pp\]\)assword/);
});

test("certificate renewal validates Nginx before reloading it", () => {
  assert.match(renewalHook, /^#!\/bin\/sh/);
  assert.match(renewalHook, /\/usr\/sbin\/nginx -t/);
  assert.match(renewalHook, /\/bin\/systemctl reload nginx/);
});
