# Default Route Service

The default route service captures the history of default route changes for all
nodes in the Terragraph network. The service periodically invokes the E2E
controller's `getDefaultRoutes` API endpoint to fetch the latest default routes.
It then stores the results in MySQL. The default fetch interval is 600 seconds,
however this value can be modified using either the `/config/update` or
`config/set` API endpoints in `tglib`.

The routes are stored in the `default_route_history` and `default_route_current`
tables (schemas below).

### Default Route History
The `default_route_history` table stores the history of routes for each node.

| Column          | Description                                           |
|-----------------|-------------------------------------------------------|
| `id`            | Entry ID                                              |
| `topology_name` | The topology the node belongs to                      |
| `node_name`     | The node the default routes belong to                 |
| `last_updated`  | Timestamp of the last time default routes were polled |
| `routes`        | The default routes in the form of a JSON array        |
| `is_ecmp`       | Whether any routes are Equal Cost Multiple Path       |
| `hop_count`     | Number of wireless hops involved in the default route |


### Default Route Current
The `default_route_current` table stores stores the current state for each node.

| Column             | Description                                            |
|--------------------|--------------------------------------------------------|
| `id`               | Entry ID                                               |
| `topology_name`    | The topology the node belongs to                       |
| `node_name`        | The node the default routes belong to                  |
| `last_updated`     | Timestamp of the last time default routes were polled  |
| `current_route_id` | ID of corresponding entry in the history table         |
