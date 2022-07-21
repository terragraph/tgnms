#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

function usage {
  echo "usage: create-default-realm-user.sh <realm> <username> <userpassword>"
}

KCADMIN="/opt/jboss/keycloak/bin/kcadm.sh"

function create_default_user {
  REALM=$1
  USERNAME=$2
  PASSWORD=$3

  if [ -z "$REALM" ] || [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]
  then
    usage && exit 1
  fi

  # shellcheck disable=SC1091
  $KCADMIN config credentials --server http://{{ upstream_keycloak }}:8080/auth --realm master --user "$KEYCLOAK_USER" --password "$KEYCLOAK_PASSWORD"

  # search for the default user, if it exists, the list of users will have length >0
  CREATE_DEFAULT_USER=$($KCADMIN get -r tgnms users?username=$USERNAME | jq --arg USERNAME "$USERNAME" -r '[ .[] | select(.username == $USERNAME) ] | length == 0')

  if [ "$CREATE_DEFAULT_USER" == "true" ]; then
    # create default user with username and password
    $KCADMIN create -r tgnms users -s username=$USERNAME -s enabled=true -s "credentials=[{\"type\":\"password\", \"value\":\"${PASSWORD}\"}]"
    # Add user to all_read and all_write roles, uusername is not a typo
    $KCADMIN add-roles --uusername $USERNAME --rolename tg_all_read --rolename tg_all_write -r tgnms
  fi
}

create_default_user "$1" "$2" "$3"
