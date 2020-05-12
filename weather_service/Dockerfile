# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/weather_service/

# Copy weather_service source files into docker container
WORKDIR $WORKDIR
COPY weather_service/ .flake8 ./

# Install weather_service
RUN pip install .
