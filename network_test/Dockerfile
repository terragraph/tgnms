# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/network_test

# Copy network_test source
WORKDIR $WORKDIR
COPY network_test/ .flake8 ./

# Install network_test and run tests
RUN pip install .[ci] && \
    ptr --system-site-packages

# Define default command
CMD ["network_test"]
