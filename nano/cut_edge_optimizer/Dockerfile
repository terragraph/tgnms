# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/nano/cut_edge_optimizer

# Copy cut_edge_optimizer source files into docker container
WORKDIR $WORKDIR
COPY nano/cut_edge_optimizer/ .flake8 ./

# Install cut_edge_optimizer
RUN pip install .[ci]

# Start the service
CMD ["cut_edge_optimizer"]
