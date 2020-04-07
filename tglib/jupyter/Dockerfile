# Pull base image
FROM secure.cxl-terragraph.com:443/tglib:latest

WORKDIR /usr/local/tglib

# Install build and runtime dependencies
RUN apk add --no-cache --virtual build-deps gcc g++ linux-headers && \
    apk add --no-cache freetype-dev && \
    pip install .[jupyter] && \
    apk del build-deps

CMD ["/bin/sh"]
