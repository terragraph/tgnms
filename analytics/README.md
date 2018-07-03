# NMS Analytics
The Analytics aims at providing basic tools and framework for network stats IO and analysis. Potential usage includes network health monitoring, issue pin-pointing, automative diagnostic, and data-driver controller designs.

## Features

Analytics Currently can:

* Link Metrics Computation: read time series from the Beringei Query Server and compute simple stats (mean and variance), and log to JSON and plot.

## Requirements

Beringei is tested and working on:

* Ubuntu 17.10

We also depend on these open source projects:

<span style="color:LightGray">*TODO: Thrift is only used for data structures generation, consider switch to fbthrift later*</span>
* [Apache::Thrift](https://github.com/apache/thrift.git)
* [requests](https://github.com/requests/requests.git)
* [h5py](https://github.com/h5py/h5py.git)
* [numpy](https://github.com/numpy/numpy.git)
* [mathplotlib](https://github.com/matplotlib/matplotlib.git)
* [python3-tk](https://github.com/python/cpython/tree/master/Lib/tkinter)


## Naming rules:
To provide readability, let"s follow the following naming rules:
* CamelCase is for classes only.
* ALL_UP_CASE is for constants only.
* small_letter is used for everything else.
* camelCase should be avoided with the best effort.
