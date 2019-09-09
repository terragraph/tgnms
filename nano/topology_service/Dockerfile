# Pull base image
FROM tglib:latest

ARG WORKDIR=/usr/local/nano/topology_service/

WORKDIR $WORKDIR

# Copy Topology service source files into docker container
COPY nano/topology_service .

# Install topology_service
RUN pip install .
