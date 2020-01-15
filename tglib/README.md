# tglib - Terragraph Library
`tglib` is a Python 3.7 framework built using `asyncio`. At its core, `tglib`
provides a simple and standardized way to write applications that can be safely
deployed as microservices in the Terragraph Docker Swarm.

Out of the box, `tglib` provides clients to access all first-class Terragraph
services and datastores including:

* API Service
* Kafka
* MySQL
* Prometheus

In addition, `tglib` creates an HTTP server with preinstalled endpoints for
getting/setting config and Prometheus stat scraping among others. Developers
can add their own endpoints to this server for their own application logic. The
base endpoints are defined in `routes.py`.

## Usage
The entry point for the `tglib` framework is the `init` function. This function
accepts up to three arguments.

The first is a `lambda` function wrapper to the entry point for your application
logic. The second parameter is a set of `Clients` that your service needs in
order to execute the application logic. The final parameter is an optional
`aiohttp.web.RouteTableDef` for defining additional endpoints to add to the HTTP
server. See the `./examples` directory for basic usages of the framework.

### Configuration
All per-service configuration should be supplied in the form of a JSON
configuration file in the service's top level directory. Overrides to the base
`tglib` configurations (mounted as `./config.json`) should be specified in an
object behind the reserved key `"overrides"`.

## Development
`tglib` uses semantic versioning (_major_._minor_._patch_) to define the version
scheme.

* Breaking changes to the client APIs or the `init` function should result in a
  _major_ version bump.
* Addition of backwards compatible functionality should result in a _minor_
  version bump.
* Backwards compatible bug fixes should result in a _patch_ version bump.

### Clients
All client classes must inherit from `BaseClient`, an abstract base class, and
override the `start` and `stop` asynchronous functions.

#### Start
Defines how the client creates the underlying resources in order to process
any IO.

#### Stop
Defines how to cleanly destroy any resources created in the `start` function.

### Thrift
Raw thrift files are copied into the `./if` directory and compiled into Python
during the creation of the `tglib` Docker image. During development, it may be
necessary to regenerate the Python thrift definitions. This can be done by
running the following commands.
```Bash
$ python setup.py build_thrift
$ pip install .
```

### Python Test Runner
`tglib` uses [ptr](https://github.com/facebookincubator/ptr) to run its tests.
The `ptr` base configuration is defined in `setup.py` and can be used to define
code coverage requirements and run `mypy` among many other things.
