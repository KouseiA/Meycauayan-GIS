FROM php:8.2-apache

# Install PDO MySQL driver
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache rewrite and headers modules for .htaccess support
RUN a2enmod rewrite headers

# Completely clear any conflicting MPM modules and enable strictly mpm_prefork
RUN rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf && a2enmod mpm_prefork

# Allow .htaccess overrides in Apache
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Set working directory
WORKDIR /var/www/html

# Copy all application files
COPY . /var/www/html/

# Copy entrypoint script and make executable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose HTTP ports
EXPOSE 80 8080

# Run entrypoint
CMD ["/usr/local/bin/entrypoint.sh"]
