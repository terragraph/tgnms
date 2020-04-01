# Analytics
The `analytics` service is a collection of periodic pipelines and jobs that
generate and pubslih derived stats using lower level (firmware) stats.

The service consumes stats from the timeseries database and computes derived
stats that are then written back to the timeseries database for UI consumption
and alerting. The `analytics` service uses the producer/consumer model to
schedule jobs. Pipelines and jobs can be added/altered by modifying the
`service_config.json` file directly or by invoking the `/config` HTTP endpoint
provided by `tglib`.

## Jobs
The `analytics` service offers the following jobs.

### `gauge_cn_power_status`
Customers on Terragraph networks occasionally power down client nodes (CNs)
when they are being unused (e.g. at night or during vacations). When
calculating network KPIs such as overall availability, it is important to
distinguish between poor link connectivity and a deliberate shutdown of the CN.

There is no definitive way to determine if a CN has been powered off as there
is no "dying gasp" message sent by the unit prior to powering down. As a result,
the following algorithm was devised:

A CN is deemed powered off if all of the following conditions hold true over a
given 30 minute period.

1. The link between the CN and its distribution node (DN) was never up.
2. The DN is reachable.
3. The end-to-end (E2E) controller is failing to ignite the link.

A 30 minute window is used in order to sufficiently fit in two node watchdog
events (which fire every 15 minutes) and comfortably rule out blockage or other
temporary malfunction events.

In addition, the algorithm uses 30 second firmware stats for its computation. It
is possible that the stats miss the event if the link is up for fewer than 30
seconds.
