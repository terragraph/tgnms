# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

# Install MySQL
RUN apk add mysql-client

ARG WORKDIR=/usr/local/scan_service

# Copy scan_service source files into docker container
WORKDIR $WORKDIR
COPY scan_service/ .flake8 ./

# Install scan_service
RUN pip install .[ci]

# Define default command
CMD ["scan_service"]
