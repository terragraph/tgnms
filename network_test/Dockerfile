# Pull base image
ARG TAG=latest
ARG BASE_IMAGE
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/network_test

# Copy network_test source
WORKDIR $WORKDIR
COPY network_test/ .flake8 ./

# Install network_test
RUN pip install .
