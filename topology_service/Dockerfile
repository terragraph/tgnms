# Pull base image
ARG TAG=latest
FROM secure.cxl-terragraph.com:443/tglib:$TAG

ARG WORKDIR=/usr/local/topology_service/

# Copy topology_service source
WORKDIR $WORKDIR
COPY topology_service/ .flake8 ./

# Install topology_service
RUN pip install .
