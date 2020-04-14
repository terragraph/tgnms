# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/scan_service

# Copy scan_service source
WORKDIR $WORKDIR
COPY scan_service/ .flake8 ./

# Install scan_service
RUN pip install .[ci]
