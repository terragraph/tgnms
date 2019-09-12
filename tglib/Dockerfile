# Pull base images
FROM thrift:0.11.0 AS thrift
FROM python:3.7.4

# Copy thrift for 'setup.py build_thrift' command
COPY --from=thrift /usr/local/bin/thrift /usr/local/bin

# Install tglib
WORKDIR /usr/local/tglib
COPY ./tglib .
COPY ./if ./if
RUN python setup.py build_thrift && pip install -e .[ci]

# Define default command
CMD ["bash"]
