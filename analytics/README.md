# Analytics
The `analytics` service is a collection of periodic pipelines and jobs that
generate and publish derived stats using lower level (firmware) stats.

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

### `find_link_foliage`
Foliage or time-varying blockage is characterized by time-varying path loss at
both ends of a wireless link.
Path loss is given by: `PL(A->Z) = txPower(A) - RSSI(Z) + G_Tx(A) + G_Rx(Z)`
where `G_Tx` and `G_Rx` are the antenna gains for the transmitter and receiver
respectively.
Path loss is calculated as follows:
 * TxPower and RSSI reported by a terragraph link over a one hour period is retrieved for both ends of the link.
 * Forward and reverse path loss of each link is calculated.
    `PL(A→Z) and PL(Z→A) = txPower(transmitter) - RSSI (receiver)`
 * The time series is divided into equal length sub-windows (number_of_windows).
     * The number of samples in the sub-window is should be large enough to compute cross covariance.
 * For each window, forward and reverse path loss offset variances are calculated.
 * If the forward or reverse variance is greater than the minimum variance
     * calculate the sample cross covariance of the forward pathloss and reverse pathloss as:
        * window_variance_sum = `VAR(PL(A→Z)) + VAR(PL(Z->A))`
        * min_window_covariance/correlation = `COV(PL(A→Z), PL(Z→A)) / SQRT(VAR(PL(A→Z) * VAR(PL(Z→A)))`
 * Calculate the Foliage Factor of each link as:
   `Foliage Factor = sum(window_variance_sum * window_covariance) / sum(window_variance_sum)`
 * Network wide foliage stats is calculated by defining num_foliage_links and num_foliage_free_links
    * For each link, if foliage factor of a link is greater than threshold (0.85),
      increment the number of foliage links else increment the number of foliage free links.

### `node_alignment`
This job analyzes alignment for every link in both directions (A and Z) for a network. Tx and Rx beam index
is retrieved for both ends of the link. The beam indices are converted to degrees and compared with
the misalignment threshold. The difference between tx and rx degree is calculated and compared with the
tx and rx degree difference threshold value.
