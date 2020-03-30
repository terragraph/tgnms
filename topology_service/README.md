# Topology Service
The `topology_service` periodically queries each network's API service for
the network topology via the `getTopology` endpoint.

The topologies are then consumed by specialized jobs within the service. The
topology service uses the producer/consumer model to schedule jobs. Pipelines
and jobs can be added/altered by modifying the `service_config.json` file
directly or by invoking the `/config` HTTP endpoint provided by `tglib`.

## Jobs
The `topology_service` offers the following jobs.

### `save_latest_topologies`
This job saves the topology to the MySQL database if there are any
non-ephemeral differenes from the last recorded topology. All topology
configurations are disregarded when comparing topologies from the same
network.

### `count_network_assets`
This job evaluates and records the following metrics to the timeseries
database.

#### Node Stats
| Metric Name               | Description               |
| ------------------------- | ------------------------- |
| `topology_node_is_online` | Is the node online (0, 1) |

#### Link Stats
| Metric Name                     | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `topology_link_is_online`       | Is the link online (0, 1)                   |
| `topology_link_attempts`        | The number of ignition attempts on the link |
| `topology_link_distance_meters` | The distance of the link, in meters         |

#### Network Stats
| Metric Name                            | Description                                        |
| -------------------------------------- | -------------------------------------------------- |
| `topology_nodes_total`                 | The number of nodes in the network                 |
| `topology_online_nodes_total`          | The number of online nodes in the network          |
| `topology_online_nodes_ratio`          | The ratio of online nodes in the network           |
| `topology_pop_nodes_total`             | The number of PoP nodes in the network             |
| `topology_wireless_links_total`        | The number of wirless links in the network         |
| `topology_online_wireless_links_total` | The number of online wireless links in the network |
| `topology_online_wireless_links_ratio` | The ratio of online wireless_links in the network  |
