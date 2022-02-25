# Pull base image
ARG TAG=latest
ARG BASE_IMAGE
FROM $BASE_IMAGE:$TAG

ARG WORKDIR=/usr/local/optimizer_service

# Copy optimizer_service source
WORKDIR $WORKDIR
COPY optimizer_service/ .flake8 ./

# Get build dependencies
RUN apk update
RUN apk add --no-cache --virtual build-deps build-base g++ make cmake python3-dev mesa-gl openblas-dev

# This is included in 'pip install .', but it takes forever so breaking it out
# here lets us use Docker's build cache in case something goes wrong in another
# step of the build
RUN pip install numpy
RUN pip install 'cvxpy>=1.0.<2' --no-deps

# Install optimizer_service
RUN pip install .

# Clear out build dependencies
RUN apk del build-deps
