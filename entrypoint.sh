#!/bin/sh
set -e

# Suppress ServerName warning
echo "ServerName localhost" >> /etc/apache2/apache2.conf 2>/dev/null || true

# 1. FIX MPM: Remove all MPM symlinks and enable strictly mpm_prefork
rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf
a2enmod mpm_prefork

# 2. FIX PORT: Overwrite ports.conf with exactly one listener matching Railway's $PORT
APP_PORT="${PORT:-80}"
echo "Listen ${APP_PORT}" > /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost *:${APP_PORT}>/g" /etc/apache2/sites-available/000-default.conf

# Clean any stale PID
rm -f /var/run/apache2/apache2.pid

# Start Apache in the foreground
exec apache2-foreground
