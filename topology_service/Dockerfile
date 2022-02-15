# Pull base image
ARG TAG=latest
ARG BASE_IMAGE
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/topology_service/

# Copy topology_service source
WORKDIR $WORKDIR
COPY topology_service/ .flake8 ./

# Install topology_service
RUN pip install .
