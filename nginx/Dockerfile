FROM openresty/openresty:alpine

RUN apk add ca-certificates certbot certbot-nginx

COPY init-cert.sh ${HTTPD_PREFIX}/bin
RUN chmod 755 ${HTTPD_PREFIX}/bin/init-cert.sh

COPY run-certbot.sh /etc/periodic/weekly
RUN chmod 755 /etc/periodic/weekly/run-certbot.sh

COPY start-cron.sh ${HTTPD_PREFIX}/bin
RUN chmod 755 ${HTTPD_PREFIX}/bin/start-cron.sh

COPY my_upload.lua /usr/local/openresty/nginx/conf/lua/

RUN apk add --no-cache --virtual build-deps curl perl && \
    opm get openresty/lua-resty-upload && \
    apk del build-deps
