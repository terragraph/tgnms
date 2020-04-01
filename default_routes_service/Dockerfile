# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/default_routes_service/

# Copy default_routes_service source files into docker container
WORKDIR $WORKDIR
COPY default_routes_service/ .flake8 ./

# Install default_routes_service
RUN pip install .[ci]

# Define default command
CMD ["/bin/sh"]
