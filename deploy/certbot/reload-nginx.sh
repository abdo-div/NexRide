#!/bin/sh
set -eu

# A renewed certificate is not used by existing Nginx workers until a reload.
# Refuse the reload if another configuration change made Nginx invalid.
/usr/sbin/nginx -t
/bin/systemctl reload nginx
