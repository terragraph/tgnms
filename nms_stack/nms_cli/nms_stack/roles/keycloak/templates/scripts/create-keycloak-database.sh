#!/bin/bash
mysql -h$DB_HOST -u$DB_ROOT_USER -p$DB_ROOT_PASSWORD -e "set @keycloak_user='${DB_USER}'; set @keycloak_password='${DB_PASSWORD}'; source /scripts/keycloak.sql;"
