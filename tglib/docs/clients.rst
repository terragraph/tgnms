.. currentmodule:: tglib

=======
Clients
=======

BaseClient
==========
.. automodule:: tglib.clients.base_client
   :members:

All clients must inherit from :class:`BaseClient`, an abstract base class, and
override the :meth:`~.BaseClient.start` and :meth:`~.BaseClient.stop` asynchronous methods.

APIServiceClient
================
.. automodule:: tglib.clients.api_service_client
   :show-inheritance:
   :members:

KafkaConsumer
=============
.. automodule:: tglib.clients.kafka_consumer
   :show-inheritance:
   :members:

KafkaProducer
=============
.. automodule:: tglib.clients.kafka_producer
   :show-inheritance:
   :members:

MySQLClient
===========
.. automodule:: tglib.clients.mysql_client
   :show-inheritance:
   :members:

PrometheusClient
================
.. automodule:: tglib.clients.prometheus_client
   :show-inheritance:
   :members:
