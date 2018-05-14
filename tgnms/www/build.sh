#!/bin/bash
NODE_ENV=production ./node_modules/webpack/bin/webpack.js \
    --progress \
    --config webpack.production.config.js
