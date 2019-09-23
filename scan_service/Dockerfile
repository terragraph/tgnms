# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

RUN apt-get update
RUN apt-get -y upgrade

# Install snappy driver
RUN apt-get install -y build-essential python3.7-dev libsnappy-dev

# Install scan_service
WORKDIR /usr/local/scan_service
COPY . .
RUN pip install .

# Remove snappy driver build dependencies
RUN apt-get purge -y --auto-remove build-essential python3.7-dev
