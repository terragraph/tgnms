# Pull base image
ARG TAG=latest
ARG BASE_IMAGE
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/analytics

# Copy analytics source
WORKDIR $WORKDIR
COPY analytics/ .flake8 ./

# Install analytics
RUN apk add py3-numpy && \
    pip install .
