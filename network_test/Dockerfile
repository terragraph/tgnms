# Pull base image
ARG TAG=latest
FROM secure.cxl-terragraph.com:443/tglib:$TAG

ARG WORKDIR=/usr/local/network_test

# Copy network_test source
WORKDIR $WORKDIR
COPY network_test/ .flake8 ./

# Install network_test
RUN pip install .
