# Multi stage application builder
FROM node:12.13-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package dependencies
COPY package.json yarn.lock babel.config.js ./
COPY fbcnms-projects/tgnms/package.json fbcnms-projects/tgnms/

ARG COMMIT_DATE
RUN echo "COMMIT_DATE=$COMMIT_DATE" >> fbcnms-projects/tgnms/.env
ARG COMMIT_HASH
RUN echo "COMMIT_HASH=$COMMIT_HASH" >> fbcnms-projects/tgnms/.env

# Install dependencies
COPY fbcnms-packages fbcnms-packages
RUN yarn install --frozen-lockfile && yarn cache clean

# Copy tgnms contents
WORKDIR /app/fbcnms-projects/tgnms
COPY fbcnms-projects/tgnms .

# Build production webpack bundle
RUN yarn run build

# Create deploy image
FROM node:12.13-alpine

# Install developer-friendly utils
RUN apk add bash curl grep tzdata vim

# Copy builder app directory
COPY --from=builder /app /app

# Update the working directory for the new image
WORKDIR /app/fbcnms-projects/tgnms

# Start app
CMD yarn run start:prod
