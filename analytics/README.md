# NMS Analytics
The Analytics aims at providing basic tools and framework for network stats IO and analysis. Potential usage includes network health monitoring, issue pin-pointing, automative diagnostic, and data-driven controller designs.

## Features

Analytics Currently can:

* Link Metrics Computation: read time series from the Beringei Query Server and compute simple stats (mean and variance), and log to JSON and plot.

## Requirements:
Please refer to the Dockerfile.

## Testing:
* Please see example for test. To run all tests, run auto_test.sh under example/
* To locally build Analytics docker image, please run build_analytics_docker.sh

## Naming rules:
To provide readability, let"s follow the following naming rules:
* CamelCase is for classes only.
* ALL_UP_CASE is for constants only.
* small_letter is used for everything else.
* camelCase should be avoided with the best effort.
