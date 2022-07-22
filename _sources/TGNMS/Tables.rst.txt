.. _tables:

Tables
======

The `tables page </tables>`_ shows searchable and filterable information about :ref:`nodes <Terminology:node>`, :ref:`sites <Terminology:site>`, network tests, and network scans.

.. figure:: _static/tables.png

1. Select between the available table views.
2. Export nodes to a ``.csv`` file.
3. These text boxes can be used to filter the data shown in the table.
4. Pagination controls to view more nodes if available.

.. _network-test:

Tests
-----
From this page you can run network tests to analyze the health of links. Network tests run iperf on the nodes in the network while collecting the relevant statistics into Prometheus. Click "Schedule Network Test" to start a network test now or in the future.

.. figure:: _static/schedule_network_test.png

    Configure options before running the network test.


.. _network-scan:

Scans
-----
From this page you can run network scans to determine interference on the network, identify potential links, and configure backup links. Click "Schedule Scan" to start a network scan now or in the future.

.. figure:: _static/schedule_scan.png

    Configure options before running the network scan.