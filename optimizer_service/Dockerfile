# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/optimizer_service

# Copy optimizer_service source
WORKDIR $WORKDIR
COPY optimizer_service/ .flake8 ./

# Install optimizer_service
RUN pip install .
