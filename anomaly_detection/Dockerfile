# Pull base image
ARG TAG=latest
FROM ghcr.io/terragraph/tglib:$TAG

ARG WORKDIR=/usr/local/anomaly_detection

# Copy anomaly_detection source
WORKDIR $WORKDIR
COPY anomaly_detection/ .flake8 ./

RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.13/main" >> /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/v3.13/community" >> /etc/apk/repositories

# Install my_service
RUN apk add py3-numpy && \
    apk add py3-scikit-learn && \
    pip install .
