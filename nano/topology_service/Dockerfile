# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nano/topology_service/

# Install MySQL
RUN apk add mysql-client

# Copy Topology service source files into docker container
WORKDIR $WORKDIR
COPY nano/topology_service/ .flake8 ./

# Install topology_service
RUN pip install .[ci]

# Run unit tests
RUN python setup.py test
