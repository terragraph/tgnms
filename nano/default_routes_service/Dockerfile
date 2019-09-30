# Pull base image
FROM tglib:latest

ARG WORKDIR=/usr/local/nano/default_routes_service/

RUN apt-get update
RUN apt-get -y upgrade

# Install MySQL
RUN apt-get install -y default-mysql-client

WORKDIR $WORKDIR

# Copy default routes service source files into docker container
COPY nano/default_routes_service .

# Install default_routes_service
RUN pip install .
