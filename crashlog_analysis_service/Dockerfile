# Pull base image
ARG TAG=latest
ARG BASE_IMAGE
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/crashlog_analysis_service

# Copy analytics source
WORKDIR $WORKDIR
COPY crashlog_analysis_service/ .flake8 ./

# Install crashlog_analysis_service
RUN pip install .
