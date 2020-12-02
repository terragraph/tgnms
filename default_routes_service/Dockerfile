# Pull base image
ARG TAG=latest
FROM secure.cxl-terragraph.com:443/tglib:$TAG

ARG WORKDIR=/usr/local/default_routes_service/

# Copy default_routes_service source
WORKDIR $WORKDIR
COPY default_routes_service/ .flake8 ./

# Install default_routes_service
RUN pip install .
