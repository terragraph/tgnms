# Default Routes Service

The default routes service uses the producer/consumer model to schedule jobs.
Pipelines and jobs can be added/altered by modifying the
`service_config.json` file directly or by invoking the `/config/update`
HTTP endpoint provided by `tglib`.

# Analysis Pipeline
This pipeline periodically invokes E2E controller's `getDefaultRoutes`
API endpoint to fetch the latest default routes for all networks
and then schedules the following jobs.

## Analyze Routes
This job performs the following analysis for all nodes in each network:
1. Check if the node's default routes have changed compared to the most
recent entry in the database and update the database if the routes have
changed or if the node is new.
2. Identify if the default routes are equal-cost multi-path and compute
the number of wireless hops for each route. Both of these stats,
`node_routes_ecmp` and `node_hop_count` are logged to the time series
database.

## Compute Link CN Routes
This job computes the number of commonly traversed wireless links belonging
to each of a client nodes' default routes in a particular network.
These values are then logged to the the time series database as
`link_cn_routes_count` and the routes themselves are stored in MySQL.
