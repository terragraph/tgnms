#!/bin/bash
mysql -h $MYSQL_HOST -u $MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "set @keycloak_user='${DB_USER}'; set @keycloak_password='${DB_PASSWORD}'; source /scripts/keycloak.sql;"
