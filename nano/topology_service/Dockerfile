# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nano/topology_service/

# Install MySQL
RUN apt-get update && \
    apt-get -y upgrade && \
    apt-get install -y default-mysql-client

# Copy Topology service source files into docker container
WORKDIR $WORKDIR
COPY ./nano/topology_service .
COPY ./.flake8 .

# Install topology_service
RUN pip install -e .[ci]

# Run unit tests
RUN python setup.py test
