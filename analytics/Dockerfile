# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/analytics

# Copy analytics source
WORKDIR $WORKDIR
COPY analytics/ .flake8 ./

# Install analytics
RUN apk add py3-numpy && \
    pip install .
