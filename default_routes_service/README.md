# Default Routes Service
The `default_routes_service` periodically queries each network's API service
for the default routes used by the nodes in the topology via the
`getDefaultRoutes` endpoint.

The default routes are then consumed by specialized jobs within the service.
The default routes service uses the producer/consumer model to schedule jobs.
Pipelines and jobs can be added/altered by modifying the `service_config.json`
file directly or by invoking the `/config` HTTP endpoint provided by `tglib`.

## Jobs
The `default_routes_service` offers the following jobs.

### `process_default_routes`
This job takes the latest default routes from API service and compares them
against the most recent entries in the database. The database is then updated
to reflect the most recent routes taken on a per-node basis.

The job also generates and pushes the following metrics to the timeseries
database.

### Node Stats
| Metric Name                  | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `drs_max_wireless_hop_count` | The maximum number of wireless hops across all default routes |
| `drs_default_routes_count`   | The total number of default routes                            |

### `process_congested_cn_egress_links`
This job uses the latest default routes for all client nodes (CNs) in order to
identify commonly traversed egress links in the network. The latest default
routes are compared to the most recent entries in the database. The database
is then updated to reflect the most recent routes taken on a per-link basis.

The job also generates and pushes the following metrics to the timeseries
database.

### Link Stats
| Metric Name                  | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| `drs_cn_egress_routes_count` | The total number of CNs that have a default route egressing on the link |
