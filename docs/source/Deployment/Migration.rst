Migration
=========

This doc details the switch from Docker Swarm in the LTS 12.20 release to Kubernetes in the LTS 03.21 release. The NMS installer version ``2021.02.11`` or later contains a new command: ``nms beta`` that lets you access the Kubernetes installer. See ``nms beta --help`` for details.

Necessary Steps
---------------
To migrate LTS 12.20 installations to the LTS 03.21 release or later, you need to remove the Docker Swarm based install from your machine and install the Kubernetes runtime. 

1. Remove Docker Swarm runtime::

        nms uninstall --config-file config.yml --host host --host host2

2. Generate config file. Most of the options here don't need to change except for ``controllers_list`` and (if you're running off a domain name) ``ext_nms_hostname``::

    nms beta show-defaults > beta_config.yml


3. Install Kubernetes and start a cluster (if you already have a running Kubernetes cluster you can skip this step)::

    nms beta install --config-file config.yml --manager host1 --worker host2 --worker host3

4. Add the NMS software stack to the Kubernetes cluster::

    nms beta apply --config-file beta_config.yml --manager host1

5. Wait a minute and visit the node, TGNMS should be up and running. You can verify it on the node by SSH-ing in and running::

    # Should say 'Running' for every entry
    kubectl get pods

The new runtime places data in the same locations (``/opt/terragraph/`` by default), so anything stored in these files such as TGNMS networks will be preserved.

To view the manifests sent to the cluster by ``nms beta apply``, use ``configure``. This shows everything specific to NMS aside from the `Helm charts <https://helm.sh/>`_ applied at the end of ``nms beta apply``::

    nms beta configure -f beta_config.yml -m host1


Technical Details
-----------------
Docker `Swarm mode <https://docs.docker.com/engine/swarm/>`_ provides a way to run a cluster of hosts and transparently schedules Docker containers to run on them via `docker-compose.yml` files. `Kubernetes <https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/>`_ is similar but provides much more fine grained control of every aspect of the cluster.

This table shows the necessary command changes to make for debugging the cluster. 

.. csv-table::
   :header: "Action", "Swarm Command", "Kubernetes Command"
   :widths: auto

   "View state of services", "``docker service ps``", "``kubectl get pods``"
   "View logs of a service", "``docker service logs <service name>``", "``kubectl logs <pod name>``"

In Kubernetes setups, much of this information can also be viewed and changed in the Kubernetes dashboard, available at ``https://<TGNMS IP or hostname>/kubernetes/``. To get a log in token, run this command:

::

    nms beta dashboard-token -m host1
