#!/bin/bash
[ "$#" -ne "2" ] && echo "Syntax: $0 <ca certificate domain> <output path>" && exit 1
CERT_DOMAIN="$1"
[ ! -d "$2" ] && echo "Output folder doesn't exist" && exit 1
OUTPUT_PATH="$2/$1"
# generate cert password if not yet set
if [ ! -f "${OUTPUT_PATH}.pass" ]; then
  PASS=$(tr -dc _A-Z-a-z-0-9 < /dev/urandom | head -c 30)
  echo "$PASS" > "${OUTPUT_PATH}.pass"
fi
PASS="$(cat "${OUTPUT_PATH}.pass")"
# generate CA
if [ ! -f "${OUTPUT_PATH}.key" ]; then
  openssl genrsa -des3 -passout "pass:${PASS}" -out "${OUTPUT_PATH}.key" 2048 && \
  openssl req -x509 -new -nodes -passin "pass:${PASS}" -key "${OUTPUT_PATH}.key" -sha256 -days 365 -out "${OUTPUT_PATH}.pem" -subj "/C=US/ST=CA/L=Menlo Park/O=Facebook/OU=FBC/CN=${CERT_DOMAIN}/"
fi
