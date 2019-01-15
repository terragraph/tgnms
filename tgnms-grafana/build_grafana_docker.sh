#!/bin/bash
set -e

echo "This script will build the terragraph grafana docker image"

docker build -t grafana:tg_grafana --build-arg "GRAFANA_VERSION=5.4.1" .
