#!/bin/bash
# Generate a self signed certificate for nginx (and our own CA) if no certificate set in nginx config

# CA certificate domain for self signing
CERT_DOMAIN="tg-link"
# nginx config to modify
NGINX_CONFIG="docker_volumes/nginx/conf.d/default.conf"

# generate self signed cert for nginx unless existing cert found
./scripts/ca-certificate-gen.sh ${CERT_DOMAIN} docker_volumes/nginx/certs > /dev/null \
&& echo CA certificate exists && \
./scripts/certificate-gen.sh ${CERT_DOMAIN} \*.${CERT_DOMAIN} docker_volumes/nginx/certs > /dev/null && \
echo x509 certificate exists && \
if [ -f "$NGINX_CONFIG" ]; then
  grep -q ssl_certificate $NGINX_CONFIG
  if ! grep -q ssl_certificate $NGINX_CONFIG; then
    sed -i.keycloak_install.bak "/root /i \\\
\t# ssl cert \n\
\tlisten 443 ssl default_server;\n\
\tlisten [::]:443 ssl default_server;\n\
\tssl_certificate /etc/nginx/certs/wildcard.${CERT_DOMAIN}.bundle.crt;\n\
\tssl_certificate_key /etc/nginx/certs/wildcard.${CERT_DOMAIN}.key;\n\
\tssl_password_file /etc/nginx/certs/${CERT_DOMAIN}.pass;\n\
\tserver_name ${CERT_DOMAIN};\n" $NGINX_CONFIG
    echo "Installed certificate in nginx config, verifying nginx config sanity..."
    if docker-compose exec nginx nginx -t; then
      echo "Restarting nginx..."
      docker-compose exec nginx nginx -s reload
    else
      echo "Nginx config invalid, abort!"
      exit 1
    fi
  else
    echo Nginx already has a certificate configured
  fi
else
  echo "Nginx config missing, bailing"
  exit 1
fi
