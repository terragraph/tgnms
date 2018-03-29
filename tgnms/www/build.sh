#!/bin/bash
./node_modules/webpack/bin/webpack.js --progress --config webpack.production.config.js -p
rm -vf dist/map.js.map
