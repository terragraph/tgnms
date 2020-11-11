# syntax = docker/dockerfile:1.1-experimental

# Build the docs in a staged build
FROM ubuntu as builder

USER root

RUN apt update
RUN apt -y install pandoc git python3 make

WORKDIR /usr/local/meta-terragraph
RUN --mount=type=secret,id=token git clone https://"$(cat /run/secrets/token)":x-oauth-basic@github.com/facebookexternal/terragraph.puma.git /usr/local/meta-terragraph

# Create the index page and any meta-terragraph docs
COPY ./docs/build_tg_docs.sh ./
RUN ./build_tg_docs.sh

# Copy over the NMS sources, build it to HTML
WORKDIR /usr/local/terragraph
COPY docs/ ./
RUN make docs POSTPROCESS_ARGS="--add_base"

RUN cd /usr/local/meta-terragraph && python3 /usr/local/terragraph/postprocess.py --file build-docs/index.html --add_base


FROM alpine:latest as make
RUN apk add make

FROM secure.cxl-terragraph.com:443/tglib:latest as tglib_builder
# For some reason 'apk add' just hangs if it's done as part of this stage, so
# copy it in manually as a workaround
COPY --from=make /usr/bin/make /usr/bin/make

WORKDIR /usr/local/tglib
COPY tglib ./
RUN python3 -m pip install sphinx sphinx-autodoc-typehints
RUN cd docs && make html


# Use nginx as a static file server
FROM nginx:1.19

# Copy the generated HTML, serve it
WORKDIR /usr/local/docs
COPY ./docs/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/local/meta-terragraph/build-docs ./
COPY --from=builder /usr/local/terragraph/build nms
COPY --from=tglib_builder /usr/local/tglib/docs/_build/html tglib
