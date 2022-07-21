Troubleshooting
===============

TGNMS runs as a series of containers deployed inside a
`Docker Swarm <https://docs.docker.com/engine/swarm/>`_. To diagnose and debug
issues inside the Swarm, SSH access to the hosts running the NMS is necessary.

Make sure you are logged into one of the Swarm hosts before running any of the
steps below.

::

    # example: ssh root@192.168.1.100
    $ ssh <a swarm host>

Common Troubleshooting Steps
----------------------------

Find which services are running and which are broken. The ``docker`` binary is
included in the installation of the NMS.

::

    $ docker service ls

::

    # Sample output, yours may look different
    ID             NAME                              MODE         REPLICAS   IMAGE                                                                                          PORTS
    y8plg8c1p9sr   chihaya_chihaya                   replicated   1/1        quay.io/jzelinskie/chihaya:v2.0.0-rc.2
    7dyluyqmde9e   database_db                       replicated   1/1        mysql:5
    w517noxowsld   e2e-lab_f8_d_api_service          replicated   1/1        secure.cxl-terragraph.com:443/e2e-controller:latest
    kyqgyw3wl83u   e2e-lab_f8_d_e2e_controller       replicated   1/1        secure.cxl-terragraph.com:443/e2e-controller:latest
    kof22ttbk9u7   e2e-lab_f8_d_nms_aggregator       replicated   1/1        secure.cxl-terragraph.com:443/e2e-controller:latest
    snbdjn3loeh0   e2e-lab_f8_d_stats_agent          replicated   1/1        secure.cxl-terragraph.com:443/e2e-controller:latest
    e8qnow4dx596   efk_elasticsearch                 global       3/3        docker.elastic.co/elasticsearch/elasticsearch:7.4.0
    h31spsfpml2u   efk_es_exporter                   replicated   1/1        justwatch/elasticsearch_exporter:1.0.2
    mal90x8raeu4   efk_fluentd                       replicated   1/1        secure.cxl-terragraph.com:443/fluentd:stable
    zwe4iai65an7   efk_kibana                        replicated   1/1        docker.elastic.co/kibana/kibana:7.4.0
    mh62145b6985   kafka_kafka                       global       3/3        secure.cxl-terragraph.com:443/kafka:stable
    xvpe9v0j9i68   kafka_zoo1                        replicated   1/1        zookeeper:latest
    qy4vaolmq064   kafka_zoo2                        replicated   1/1        zookeeper:latest
    9ln8ld38gx85   kafka_zoo3                        replicated   1/1        zookeeper:latest
    p27dsw42pd3z   keycloak_keycloak                 replicated   1/1        jboss/keycloak:7.0.0
    yn6nfzh6n9pr   monitoring_cadvisor               global       3/3        google/cadvisor:latest
    srq0xdlooff1   msa_analytics                     replicated   1/1        secure.cxl-terragraph.com:443/analytics:rc
    uw2c97t89gsh   msa_default_routes_service        replicated   1/1        secure.cxl-terragraph.com:443/default_routes_service:rc
    law793veyulo   msa_network_test                  replicated   1/1        secure.cxl-terragraph.com:443/network_test:rc
    zp07zhcf30zx   msa_scan_service                  replicated   1/1        secure.cxl-terragraph.com:443/scan_service:rc
    qxaih3zv3ila   msa_topology_service              replicated   1/1        secure.cxl-terragraph.com:443/topology_service:rc
    njqhnfwqae1q   msa_weather_service               replicated   1/1        secure.cxl-terragraph.com:443/weather_service:rc
    wkey83a0arce   nms_docs                          replicated   1/1        secure.cxl-terragraph.com:443/nms_docs:rc
    w97mx4cb37oq   nms_grafana                       replicated   1/1        grafana/grafana:latest
    fzepjjsm7wa0   nms_jupyter                       replicated   1/1        jupyter/scipy-notebook:latest
    ulwa7g607ojl   nms_nms                           replicated   1/1        secure.cxl-terragraph.com:443/nmsv2:rc
    daaczr27inz6   stats_alertmanager                replicated   1/1        prom/alertmanager:latest
    3vxhh207gcp8   stats_alertmanager_configurer     replicated   1/1        facebookincubator/alertmanager-configurer:1.0.1
    p9mqpdft4qpz   stats_prometheus                  replicated   1/1        prom/prometheus:latest
    yqxe9vmb71yy   stats_prometheus_cache            replicated   1/1        facebookincubator/prometheus-edge-hub:1.1.0
    taz5i5dyuhft   stats_prometheus_configurer       replicated   1/1        facebookincubator/prometheus-configurer:1.0.1
    v3ovbudhpuho   stats_query_service               replicated   1/1        secure.cxl-terragraph.com:443/cpp_backends:rc
    ljvv6z9m9y80   tg-alarms_alarms                  replicated   1/1        secure.cxl-terragraph.com:443/tg-alarms:rc

If a service does not show ``n/n`` under ``REPLICAS``, it is likely having problems.
To investigate further, check the service logs.

::

    $ docker service logs nms_nms
