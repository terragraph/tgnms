FROM alpine
RUN apk add openrc squid nginx nginx-mod-stream
COPY nginx.conf /etc/nginx/
COPY squid.conf /etc/squid/
RUN rc-update add nginx default && rc-update add squid default
ENTRYPOINT ["/sbin/init"]
EXPOSE 8080/tcp
EXPOSE 3306/tcp
