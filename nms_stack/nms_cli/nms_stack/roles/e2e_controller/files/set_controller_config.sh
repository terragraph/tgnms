#!/bin/bash
CONTROLLER_NAME="$1"
KEYCLOAK_TOKEN="$2"

API_SERVICE="e2e-${CONTROLLER_NAME}_api_service"
E2E_CONTROLLER="e2e_controller-${CONTROLLER_NAME}"
NODE_IMAGE_PATH="/node_image/${CONTROLLER_NAME}/"
CONTROLLER_CONFIG_FILE=$(mktemp)

# make all requests internal
unset http_proxy
unset https_proxy
touch headers
CURL_CMD="curl --fail --noproxy '*' -H @headers"
if [ -n "$KEYCLOAK_TOKEN" ]; then
  echo "Authorization: Bearer $KEYCLOAK_TOKEN" > headers
fi

# fetch existing controller config
if $CURL_CMD "http://${API_SERVICE}:8080/api/v2/getControllerConfig" > "${CONTROLLER_CONFIG_FILE}" 2>/dev/null; then
  # set controller config defaults
  # - zmq_url for connecting e2e_controller/stats_agent
  # - kafka stats broker endpoint
  # - node_image HTTP path for SW upgrades
  if cat "$CONTROLLER_CONFIG_FILE" | jq ".config | fromjson
      * {\"statsAgentParams\": {\"sources\": {\"controller\": {\"enabled\": true, \"zmq_url\": \"tcp://${E2E_CONTROLLER}:28989\"}}}}
      * {\"statsAgentParams\": {\"endpointParams\": {\"kafkaParams\": {\"config\": {\"brokerEndpointList\": \"PLAINTEXT://kafka:9092\"}}}}}
      * {\"flags\": {\"upgrade_image_http_path\" : \"${NODE_IMAGE_PATH}\"}}" | jq '{"config": . | tojson}' | \
      $CURL_CMD "http://${API_SERVICE}:8080/api/v2/setControllerConfig" --data @- 2>/dev/null | jq '.success'; then
    exit 0
  fi
fi
exit 1
