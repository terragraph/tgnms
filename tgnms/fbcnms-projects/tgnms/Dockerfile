# Multi stage application builder
FROM node:alpine AS builder

# Create app directory
WORKDIR /app

# Copy package dependencies
COPY package.json yarn.lock babel.config.js ./
COPY fbcnms-projects/tgnms/package.json fbcnms-projects/tgnms/

# Install dependencies
COPY fbcnms-packages fbcnms-packages
RUN yarn install --frozen-lockfile && yarn cache clean

# Copy tgnms contents
WORKDIR /app/fbcnms-projects/tgnms
COPY fbcnms-projects/tgnms .

# Build production webpack bundle
RUN yarn run build

# Create deploy image
FROM node:alpine

# Install developer-friendly utils
RUN apk add bash curl grep tzdata vim

# Copy builder app directory
COPY --from=builder /app /app

# Start app
CMD yarn start
