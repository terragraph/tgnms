# Pull base image
ARG TAG=latest
FROM secure.cxl-terragraph.com:443/tglib:$TAG

ARG WORKDIR=/usr/local/network_health_service

# Copy network_health_service source
WORKDIR $WORKDIR
COPY network_health_service/ .flake8 ./

# Install network_health_service
RUN pip install .
