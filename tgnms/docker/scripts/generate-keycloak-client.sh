#!/bin/bash
function usage {
  echo "usage: generate-keycloak-client.sh <oauth client-id> <env file path> "
}

KCADMIN="docker-compose exec keycloak /opt/jboss/keycloak/bin/kcadm.sh"

function generate_client {
  REALM=tgnms
  CLIENT_ID=$1
  ENV_FILE=$2

  if [ -z "$CLIENT_ID" ] || [ -z "$ENV_FILE" ]
  then
    usage && exit 1
  fi

  if [ ! -f "./docker-compose.yml" ]; then
    echo -e "\e[31mERROR: could not find docker-compose.yml. docker-compose.yml must be in current working directory.\e[0m" && exit 1
  fi

  if [ ! -f ./env/keycloak.env ]; then
    echo -e "\e[31mERROR: could not find file env/keycloak.env\e[0m" && exit 1
  fi
  
  # shellcheck disable=SC1091
  source ./env/keycloak.env
  $KCADMIN config credentials --server http://localhost:8080/auth --realm master --user "$KEYCLOAK_USER" --password "$KEYCLOAK_PASSWORD"

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
    echo "KEYCLOAK_HOST=http://keycloak:8080"
    echo "KEYCLOAK_CLIENT_ID=$CLIENT_ID"
    echo "KEYCLOAK_REALM=$REALM"
    echo "KEYCLOAK_CLIENT_SECRET=$SECRET"
  } > "$ENV_FILE"

  echo -e "\e[32mfinished generating keycloak client: $CLIENT_ID\e[0m\n"
  docker-compose up -d
}

generate_client "$1" "$2"
