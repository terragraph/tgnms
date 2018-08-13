#!/bin/bash

export MYSQL_HOST=$(hostname)
export MYSQL_USER=nms
export MYSQL_PASS=o0Oe8G0UrBrT
export BQS=http://192.168.99.100:8086

PORT=8080 yarn run start
