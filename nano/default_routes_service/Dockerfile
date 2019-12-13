# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nano/default_routes_service/

# Install MySQL
RUN apk add mysql-client

# Copy default routes service source files into docker container
WORKDIR $WORKDIR
COPY nano/default_routes_service/ .flake8 ./

# Install default_routes_service
RUN pip install .[ci]

# Run unit tests
RUN python setup.py test
