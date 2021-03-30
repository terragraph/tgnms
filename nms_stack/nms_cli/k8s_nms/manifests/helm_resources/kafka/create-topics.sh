#!/bin/bash

set -e

echo "Creating topics"

BIN=/opt/bitnami/kafka/bin
SERVER=kafka:9092

# Wait Kafka to come up
sleep 5

${BIN}/kafka-topics.sh --bootstrap-server ${SERVER} --create --topic events --if-not-exists
${BIN}/kafka-topics.sh --bootstrap-server ${SERVER} --create --topic stats --if-not-exists
${BIN}/kafka-topics.sh --bootstrap-server ${SERVER} --create --topic alarms --if-not-exists
${BIN}/kafka-topics.sh --bootstrap-server ${SERVER} --create --topic hf_stats --if-not-exists