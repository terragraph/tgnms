# Pull base image
ARG TAG=latest
FROM secure.cxl-terragraph.com:443/tglib:$TAG

ARG WORKDIR=/usr/local/scan_service

# Copy scan_service source
WORKDIR $WORKDIR
COPY scan_service/ .flake8 ./

# Install scan_service
RUN apk add py3-numpy && \
    pip install .
