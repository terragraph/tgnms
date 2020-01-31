# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nms

RUN apt-get update && apt-get install -y netcat

# Copy Analytics source files into docker container
WORKDIR $WORKDIR
COPY network_test ./network_test
COPY analytics ./analytics

# Install out modules into python3's module dir so we don't need sys.path hacks
# Also will install python dependencies defined in setup.py
RUN pip install ./analytics
RUN pip install ./network_test


# Define default command
CMD ["bash"]
