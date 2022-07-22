NMS Config
==========

The `NMS Config </config/>`_ page has options to configure TGNMS itself as well as some of the services it relies on to function.

Networks
--------
This is the landing page when a TGNMS instance is first created. To create a network, see the `relevant section </docs/operator.html#nms-configuration>`_ of the Operator Documentation.

Services
--------
TGNMS is one of many services within the TGNMS suite. If your TGNMS instance is not customized, you will not need to change any of these values from their defaults. The default URLs assume that TGNMS is running in an overlay network (such as in Docker or Kubernetes) that provides DNS for the other services.

Upon changing any settings, scroll back to the top of the page and click "Save" to see a preview of the changes before applying.

* **Software Portal** - Software Portal manages distribution and versioning of node firmware.
* **Stats** - Configure connection to Prometheus, Grafana, and Kibana.
* **Alarms** - Configure the :ref:`Alerts <alerts>` page and related services (Alertmanager).
* **Network Test** - Configure the address of the :ref:`Network Test <network-test>` service.
* **Scan Service** - Configure the address of the :ref:`Network Scan <network-scan>` service.
* **Authentication** - Configure and set Authentication behind Keycloak.
* **Database** - Configure the connection to the MySQL database used by TGNMS and other services.
* **Controller** - Set the timeout (in milliseconds) to the E2E controllers.
* **Configuration Editing Views** - Toggle the various supported editors.
* **Experimental Features** - Toggle certain TGNMS features that have not been enabled by default.
.. * **Historical Stats** - TODO

Map Profiles
------------
Map profiles can fetch overlays from a remote server or server running within the TGNMS cluster.
