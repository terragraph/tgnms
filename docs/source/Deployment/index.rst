TGNMS Deployment
================

.. toctree::
   :maxdepth: 2

   Troubleshooting
   Migration
   ControllerAPI
   Stats

TGNMS is deployed as a set of services running in a Docker Swarm. Each service is based on a Docker image with a particular tag, For example, the image ``ghcr.io/terragraph/nmsv2:stable`` refers to:

* The Docker image repository ``ghcr.io``
* The Docker image name ``nmsv2``
* The tag ``stable``


.. _image-upgrades:

Upgrading Images
----------------
To upgrade images in the Docker Swarm, re-run the TGNMS installer command-line tool with the image names you want to use specified in your ``config.yml``. If this section of your ``config.yml`` is unchanged, you will be upgraded to the latest ``stable`` versions for each image.
