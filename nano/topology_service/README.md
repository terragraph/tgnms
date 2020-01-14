# Topology Service
The topology service records the history of Terragraph network topologies
by periodically querying the API Service's `getTopology` endpoint and
saving the results in MySQL.

The topology service uses the producer/consumer model to schedule jobs.
Pipelines and jobs can be added/modified by modifing the
`service_config.json` file directly or by invoking the `/config/update`
HTTP endpoint provided by `tglib`.
