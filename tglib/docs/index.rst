.. tglib documentation master file, created by
   sphinx-quickstart on Fri May  8 21:47:08 2020.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

=================================
Welcome to tglib's documentation!
=================================

:mod:`tglib` is a Python 3.8 framework built using :mod:`asyncio`. At its core,
:mod:`tglib` provides a simple and standardized way to write applications that
can be safely deployed as microservices in the Terragraph Docker Swarm. Out of
the box, :mod:`tglib` provides :doc:`clients<./clients>` to access all first-class
Terragraph services and datastores.

In addition, :mod:`tglib` creates an HTTP server with
:doc:`preinstalled endpoints<./routes>` for getting/setting configuration and
Prometheus metric exposition among others. Developers can add their own endpoints to
this server for their own application logic.

Usage
=====

The entrypoint for the :mod:`tglib` framework is the :func:`~.init` function.

.. autofunction:: tglib.main.init

.. _tglib-quickstart:

Quickstart
----------

The follwing example shows how to use :mod:`tglib` to create a simple microservice for
consuming and printing records from Kafka. Assume the following service configuration.

.. code-block:: json

   {
      "topics": ["stats, hf_stats"]
   }

A ``lambda`` wrapper of ``async_main``, the entrypoint for the service's business logic,
and its parameters are supplied with a set of clients (only the :class:`~.KafkaConsumer`
is needed in this example) to the :func:`~.init` function.

Then, to use the :class:`~.KafkaConsumer` object, simply create one using its constructor.

.. code-block:: python

   import json
   from typing import Dict, NoReturn

   from tglib import init
   from tglib.clients import KafkaConsumer


   async def async_main(config: Dict) -> NoReturn:
      """Create a KafkaConsumer instance and print the topic records to the console."""
      consumer = KafkaConsumer().consumer
      consumer.subscribe(config["topics"])

      async for msg in consumer:
         print(
            f"{msg.topic}:{msg.partition:d}:{msg.offset:d}: "
            f"key={msg.key} value={msg.value} timestamp_ms={msg.timestamp}"
         )

   if __name__ == "__main__":
      """Pass in the entrypoint function and a set of clients into 'init'."""
      with open("./service_config.json") as f:
         config = json.load(f)

      init(lambda: async_main(config), {KafkaConsumer})

See the :doc:`Advanced Usage<./advanced>` page for more in-depth examples of the
framework.

Thrift
======

Raw thrift files are copied into the ``./if`` directory and compiled into Python
during the creation of the :mod:`tglib` Docker image. During development, it may be
necessary to regenerate the Python thrift definitions. This can be done by running the
running the ``build_thrift`` custom command class and reinstalling :mod:`tglib` on the
``dev`` image.

.. code-block:: bash

   $ python setup.py build_thrift
   $ pip install .

Testing
=======

:mod:`tglib` uses `ptr <https://github.com/facebookincubator/ptr>`_ to run its tests.
:mod:`ptr` can also be used to define code coverage requirements, format code, and
perform static type analysis. The :mod:`ptr` base configuration is defined in
``setup.py`` and can be installed on the ``dev`` image along with the other
:mod:`tglib` testing dependencies.

.. code-block:: bash

   $ pip install .[ci]

Table of Contents
=================

.. toctree::
   :name: mastertoc
   :maxdepth: 2

   api
   advanced
