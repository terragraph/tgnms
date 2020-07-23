# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:dev

WORKDIR /usr/local/tglib

# Install build and runtime dependencies
RUN apk add --no-cache --virtual build-deps \
        gcc \
        g++ \
        jpeg-dev \
        libffi-dev \
        python3-dev \
        zlib-dev && \
    apk add py3-matplotlib py3-numpy py3-pandas && \
    pip install .[jupyter] && \
    apk del build-deps

# Copy the startup script
COPY tglib/jupyter/00-start_server.py /root/.ipython/profile_default/startup

# Create the notebook directory
RUN mkdir jupyter/notebooks
