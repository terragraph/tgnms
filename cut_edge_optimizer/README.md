# Cut Edge Optimizer Service

The cut edge optimizer service periodically reads topology information to find
all edges that will isolate one or more client nodes (CNs), if down. The service
disables link impairment detection and reduces link flap backoff for the nodes
forming the edges. The default fetch interval is **86400** seconds (1 day),
however this value can be modified using either the `/config/update` or
`config/set` API endpoints in `tglib`.
