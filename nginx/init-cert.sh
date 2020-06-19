#!/usr/bin/env sh
case ${certbot_user_email} in '') echo "$0: certbot_user_email is required to use certbot" >&2; exit 0;; esac

CONF_DIR=/etc/letsencrypt
FULLCHAIN=$CONF_DIR/live/${ext_nms_hostname}/fullchain.pem
PRIVKEY=$CONF_DIR/live/${ext_nms_hostname}/privkey.pem

if [ ! -r $FULLCHAIN ] || [ ! -r $PRIVKEY ]; then
  certbot certonly --standalone -d ${ext_nms_hostname} -m ${certbot_user_email} --agree-tos -n ${certbot_args}
else
  echo "certs exist, skipping certbot initialization"
fi
