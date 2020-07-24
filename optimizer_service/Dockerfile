# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/optimizer_service

# Copy optimizer_service source
WORKDIR $WORKDIR
COPY optimizer_service/ .flake8 ./

# Install optimizer_service
RUN apk add --no-cache --virtual build-deps build-base cmake gcc gfortran python3-dev && \
    apk add openblas-dev && \
    pip install numpy scipy ecos scs && \
    apk del build-deps && \
    pip install .
