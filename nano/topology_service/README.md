# Topology Service

Topology fetch service captures the history of Terragraph network's topology
over time.

It does this by using `getTopology` API request to fetch the latest topology
periodically, and stores it in MongoDB.

The default fetch interval is 600 seconds.
This can be modified by using `tglib`'s `/config/update` API endpoint.
Expected body:

        {"overrides": {"fetch_interval_s": 900}}


This service provides the following API endpoint:
1. **POST** `/topology_history`:
Return a list of last N number of topologies.
        curl -id '{"count": 10}' http://localhost:8080/topology_history
The above example returns a list of 10 topologies that have been fetched
by the topology fetch service.
