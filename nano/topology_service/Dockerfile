# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nano/topology_service/

WORKDIR $WORKDIR

# Copy Topology service source files into docker container
COPY ./nano/topology_service .
COPY ./.flake8 .

# Install topology_service
RUN pip install .
