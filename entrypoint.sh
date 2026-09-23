#!/bin/sh
set -e

# Suppress Apache ServerName warning
echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Cleanly configure port: overwrite ports.conf so there are NEVER duplicate listeners
APP_PORT="${PORT:-80}"
echo "Listen ${APP_PORT}" > /etc/apache2/ports.conf

# Configure VirtualHost to match APP_PORT
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost *:${APP_PORT}>/g" /etc/apache2/sites-available/000-default.conf

# Clean any stale PID
rm -f /var/run/apache2/apache2.pid

# Start Apache in the foreground
exec apache2-foreground
