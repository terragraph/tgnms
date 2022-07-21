#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# DEPRECATED - Creates the NMS client in keycloak

function usage {
  echo "usage: generate-keycloak-client.sh <oauth client-id> <env file path> "
}

KCADMIN="/opt/jboss/keycloak/bin/kcadm.sh"

function generate_client {
  REALM=tgnms
  CLIENT_ID=$1
  ENV_FILE=$2

  if [ -z "$CLIENT_ID" ] || [ -z "$ENV_FILE" ]
  then
    usage && exit 1
  fi

  # shellcheck disable=SC1091
  $KCADMIN config credentials --server http://keycloak_keycloak:8080/auth --realm master --user "$KEYCLOAK_USER" --password "$KEYCLOAK_PASSWORD"

  echo "generating keycloak client: $CLIENT_ID"

  echo "> querying primary key"
  # cache the primary key of client (not the OAuth client-id)
  ID=$($KCADMIN get clients -r $REALM -q clientId="$CLIENT_ID" | jq -r '.[0].id')
  if [ -z "$ID" ]
  then
    echo -e "\e[31mERROR: could not load primary key of client: $CLIENT_ID\e[0m" && exit 1
  fi

  echo "> generating client secret"
  # regenerate the client secret
  $KCADMIN create "clients/$ID/client-secret" -r $REALM
  # query the new client secret
  SECRET=$($KCADMIN get "clients/$ID/client-secret" -r $REALM | jq -r '.value')

  echo "> writing out env file: $ENV_FILE"
  # generate the env file
  {
    echo "LOGIN_ENABLED=true"
    echo "KEYCLOAK_HOST=http://keycloak_keycloak:8080"
    echo "KEYCLOAK_CLIENT_ID=$CLIENT_ID"
    echo "KEYCLOAK_REALM=$REALM"
    echo "KEYCLOAK_CLIENT_SECRET=$SECRET"
  } > "$ENV_FILE"

  echo -e "\e[32mfinished generating keycloak client: $CLIENT_ID\e[0m\n"

  echo "assigning service account roles to client: $CLIENT_ID"

  # nms service account has all read privileges by default
  DEFAULT_NMS_ROLE="tg_all_read"
  SERVICE_ACCOUNT_ID=$($KCADMIN get -r $REALM clients/$ID/service-account-user | jq -r '.id')
  SERVICE_ACCOUNT_ROLE_ID=$($KCADMIN get -r $REALM roles | jq -r --arg DEFAULT_NMS_ROLE "$DEFAULT_NMS_ROLE" '.[] | select(.name == $DEFAULT_NMS_ROLE) | .id')
  $KCADMIN create -r $REALM users/$SERVICE_ACCOUNT_ID/role-mappings/realm -f - <<EOF
  [{
    "clientRole":false,
    "composite":true,
    "containerId":"$REALM",
    "id":"$SERVICE_ACCOUNT_ROLE_ID",
    "name":"$DEFAULT_NMS_ROLE"
  }]
EOF
}

generate_client "$1" "$2"
