# syntax = docker/dockerfile:1.1-experimental

# Build the docs in a staged build

# -------- #
# NMS docs #
# -------- #

FROM ubuntu as builder

USER root

RUN apt update
RUN apt -y install pandoc python3 python3-pip make
RUN python3 -m pip install sphinx sphinx-autodoc-typehints nbsphinx ipython

# Copy over the NMS sources, build it to HTML
WORKDIR /usr/local/terragraph
COPY docs/ ./
RUN make html
RUN make ipynb

# ---------- #
# tglib docs #
# ---------- #

FROM alpine:latest as make
RUN apk add make

FROM ghcr.io/terragraph/tglib:latest as tglib_builder
# For some reason 'apk add' just hangs if it's done as part of this stage, so
# copy it in manually as a workaround
COPY --from=make /usr/bin/make /usr/bin/make

WORKDIR /usr/local/tglib
COPY tglib ./
RUN apk add py3-pip
RUN python3 -m pip install sphinx sphinx-autodoc-typehints
RUN cd docs && make html

# ----- #
# serve #
# ----- #

# Use nginx as a static file server
FROM nginx:1.19

# Copy the generated HTML, serve it
WORKDIR /usr/local/docs
COPY ./docs/default.conf /etc/nginx/conf.d/default.conf
COPY ./docs/_static/ /usr/local/docs/
COPY --from=builder /usr/local/terragraph/build/html nms
COPY --from=tglib_builder /usr/local/tglib/docs/_build/html tglib
