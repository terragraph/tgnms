# Pull base image
ARG TAG=latest
FROM secure.cxl-terragraph.com:443/tglib:$TAG

ARG WORKDIR=/usr/local/weather_service/

# Copy weather_service source files into docker container
WORKDIR $WORKDIR
COPY weather_service/ .flake8 ./

# Install weather_service
RUN pip install .
