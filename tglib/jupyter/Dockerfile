# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:dev

WORKDIR /usr/local/tglib

# Install build and runtime dependencies
RUN apk add --no-cache --virtual build-deps \
        gcc \
        g++ \
        libffi-dev \
        linux-headers \
        musl-dev \
        openssl-dev \
        python3-dev && \
    apk add --no-cache freetype-dev && \
    pip install wheel && \
    pip install .[jupyter] && \
    apk del build-deps

# Copy the startup script
COPY tglib/jupyter/00-start_server.py /root/.ipython/profile_default/startup

# Create the notebook directory
RUN mkdir jupyter/notebooks
