#!/bin/bash
set -e

echo "This script will build the terragraph grafana docker image"

DEV_PERM_PACKAGES="vim"
DEV_EXTRA_PACKAGES="${DEV_PERM_PACKAGES} $@"

if [[ -z "${DEV_PERM_PACKAGES}" && "$#" -eq 0 ]]; then
    echo "Building standard image"
else
    echo "Building image and adding: ${DEV_EXTRA_PACKAGES}"
fi

docker build -t grafana:tg_grafana --build-arg "DEV_EXTRA_PACKAGES=${DEV_EXTRA_PACKAGES}" .
