# Topology Service
The topology fetch service captures the history of a Terragraph network's
topology by periodically querying the API Service's `getTopology` endpoint and
saving the results in MySQL.

The default fetch interval is 600 seconds (10 minutes), however the value is
configurable via the `/config/update` endpoint provided by `tglib`.
