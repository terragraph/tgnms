# Pull base image
ARG TAG=latest
# ARG REGISTRY_PATH=default
ARG BASE_IMAGE
# RUN echo "$REGISTRY_PATH"
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/scan_service

# Copy scan_service source
WORKDIR $WORKDIR
COPY scan_service/ .flake8 ./

# Install scan_service
RUN apk add py3-numpy && \
    pip install .
