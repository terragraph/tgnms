# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nano/topology_service/

# Copy topology_service source files into docker container
WORKDIR $WORKDIR
COPY nano/topology_service/ .flake8 .ptrconfig ./

# Install topology_service
RUN pip install .[ci]

# Define default command
CMD ["topology_service"]
