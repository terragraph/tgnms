FROM nginx:1.14

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get -y install cron certbot openssl ca-certificates netcat python-certbot-nginx

COPY init-cert.sh ${HTTPD_PREFIX}/bin
RUN chmod 755 ${HTTPD_PREFIX}/bin/init-cert.sh

COPY run-certbot.sh /etc/cron.weekly
RUN chmod 755 /etc/cron.weekly/run-certbot.sh

COPY start-cron.sh ${HTTPD_PREFIX}/bin
RUN chmod 755 ${HTTPD_PREFIX}/bin/start-cron.sh
