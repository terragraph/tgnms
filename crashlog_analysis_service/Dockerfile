# Pull base image
ARG TAG=latest
FROM secure.cxl-terragraph.com:443/tglib:$TAG

ARG WORKDIR=/usr/local/crashlog_analysis_service

# Copy analytics source
WORKDIR $WORKDIR
COPY crashlog_analysis_service/ .flake8 ./
