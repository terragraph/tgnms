# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nano/default_routes_service/

# Install MySQL
RUN apt-get update && \
    apt-get -y upgrade && \
    apt-get install -y default-mysql-client

# Copy default routes service source files into docker container
WORKDIR $WORKDIR
COPY ./nano/default_routes_service .
COPY ./.flake8 .

# Install default_routes_service
RUN pip install -e .[ci]

# Run unit tests
RUN python setup.py test
