#!/bin/bash
[ "$#" -ne "3" ] && echo "Syntax: $0 <ca certificate domain> <certificate domain> <output path>" && exit 1
CERT_DOMAIN="$1"
DOMAIN="$2"
OUTPUT_PATH="$3"
[ ! -d "$OUTPUT_PATH" ] && echo "Output folder doesn't exist" && exit 1
# generate cert password if not yet set
[ ! -f "${OUTPUT_PATH}/${CERT_DOMAIN}.pass" ] || [ ! -f "${OUTPUT_PATH}/${CERT_DOMAIN}.key" ] && \
  echo Missing CA certificate, run ca-certificate-gen.sh first && exit 1
# if DOMAIN has a wildcard
DOMAIN_FILE="${OUTPUT_PATH}/${DOMAIN}"
if echo "$DOMAIN" | grep -q "\*"; then
  DOMAIN_FILE="${OUTPUT_PATH}/wildcard$(echo "$DOMAIN" | cut -d\* -f2)"
fi
PASS=$(cat "${OUTPUT_PATH}/${CERT_DOMAIN}.pass")
# signed cert
openssl genrsa -des3 -passout "pass:${PASS}" -out "${DOMAIN_FILE}.key" 2048 && \
openssl req -new -passin "pass:${PASS}" -key "${DOMAIN_FILE}.key" -out "${DOMAIN_FILE}.csr" -subj "/C=US/ST=CA/L=Menlo Park/O=Facebook/OU=FBC/CN=${DOMAIN}/" && \
openssl x509 -req -passin "pass:${PASS}" -in "${DOMAIN_FILE}.csr" -CA "${OUTPUT_PATH}/${CERT_DOMAIN}.pem" -CAkey "${OUTPUT_PATH}/${CERT_DOMAIN}.key" -CAcreateserial -out "${DOMAIN_FILE}.crt" -days 365 -sha256 && \
# generate bundle
cat "${DOMAIN_FILE}.crt" "${OUTPUT_PATH}/${CERT_DOMAIN}.pem" > "${DOMAIN_FILE}.bundle.crt"
echo Success
