#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

function usage {
  echo "usage: copy-public-key.sh <keycloak realm> <public key file path> "
}

KCADMIN="/opt/jboss/keycloak/bin/kcadm.sh"

function copy_public_key {
  REALM=$1
  PUBLIC_KEY_FILE=$2

  if [ -z "$REALM" ] || [ -z "$PUBLIC_KEY_FILE" ]
  then
    usage && exit 1
  fi
  export KC_OPTS="-Djava.net.preverIPv6Stack=true -Djava.net.preferIPv6Addresses=true"
  # shellcheck disable=SC1091
  $KCADMIN config credentials --server http://{{ upstream_keycloak }}:8080/auth --realm master --user "$KEYCLOAK_USER" --password "$KEYCLOAK_PASSWORD"
  if [ $? -ne 0 ]; then
      echo "ERROR DETECTED"
      exit 1
  fi

  echo "querying realm public key"

  # get the id of the public key
  KEY_ID=$($KCADMIN get keys -r tgnms | jq -r '.active.RS256')
  echo "> got RS256 key id: ${KEY_ID}"
  echo "> retrieving RS256 public key with id: ${KEY_ID}"
  # gets all key metadatas, then filters based on the KEY_ID found in the previous command
  PUBLIC_KEY=$($KCADMIN get keys -r tgnms | jq -r --arg KEY_ID "$KEY_ID" '.keys[] | select(.kid == $KEY_ID) | .publicKey')

  echo "> got RS256 public key:\n${PUBLIC_KEY}"
  echo "writing public key to file: ${PUBLIC_KEY_FILE}"

  # apiservice expects
  {
    echo "-----BEGIN PUBLIC KEY-----"
    echo "$PUBLIC_KEY"
    echo "-----END PUBLIC KEY-----"
  } > "$PUBLIC_KEY_FILE"
}

copy_public_key "$1" "$2"
