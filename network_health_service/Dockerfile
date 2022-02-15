# Pull base image
ARG TAG=latest
ARG BASE_IMAGE
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/network_health_service

# Copy network_health_service source
WORKDIR $WORKDIR
COPY network_health_service/ .flake8 ./

# Install network_health_service
RUN pip install .
