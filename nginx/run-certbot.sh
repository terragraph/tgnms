#!/usr/bin/env sh
# Copyright (c) 2014-present, Facebook, Inc.
case ${certbot_user_email} in '') echo "$0: certbot_user_email is required to use certbot" >&2; exit 0;; esac

# Renew certbot
certbot renew --nginx -n ${certbot_args}
