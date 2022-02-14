# Pull base image
ARG TAG=latest
ARG BASE_IMAGE
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/weather_service/

# Copy weather_service source files into docker container
WORKDIR $WORKDIR
COPY weather_service/ .flake8 ./

# Install weather_service
RUN pip install .
