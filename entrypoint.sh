#!/bin/sh
set -e

# Suppress ServerName warning
echo "ServerName localhost" >> /etc/apache2/apache2.conf

# 100% guaranteed fix for Apache MPM conflict: remove all MPMs and enable only prefork
rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf
a2enmod mpm_prefork

# Ensure Apache listens on BOTH 80, 8080, and dynamic $PORT
echo "Listen 80" >> /etc/apache2/ports.conf
echo "Listen 8080" >> /etc/apache2/ports.conf
if [ -n "$PORT" ] && [ "$PORT" != "80" ] && [ "$PORT" != "8080" ]; then
    echo "Listen $PORT" >> /etc/apache2/ports.conf
fi

# Configure VirtualHost to respond on any port
sed -i 's/<VirtualHost \*:[0-9]*>/<VirtualHost *:*>/g' /etc/apache2/sites-available/000-default.conf

# Remove any pre-existing Apache PID
rm -f /var/run/apache2/apache2.pid

# Start Apache
exec apache2-foreground
