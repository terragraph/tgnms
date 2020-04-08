# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

ARG WORKDIR=/usr/local/cut_edge_optimizer

# Copy cut_edge_optimizer source
WORKDIR $WORKDIR
COPY cut_edge_optimizer/ .flake8 ./

# Install cut_edge_optimizer
RUN pip install .[ci]
