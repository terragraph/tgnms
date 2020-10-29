# Network Test
`network_test` is an engine for scheduling and running instantaneous traffic
tests on a Terragraph network.

## Supported Tests
Three types of tests are currently supported. As the tests are being conducted,
key firmware link stats are collected from Prometheus and saved in the database
alongside the raw `iperf` blobs.

Network tests can be conducted holistically or on individual segments of the
topology by supplying an optional `whitelist` parameter to the `schedule` or
`execution` API creation endpoints. The `whitelist` is expected to be a list of
link names in the case of **Parallel** and **Sequential** tests, and a list of
node names in the case of **Multihop** tests.

### Multihop Test
Start bidirectional `iperf` sessions from one node per site to one of its
default PoP nodes. One PoP is randomly selected if a particular node has ECMP
routes for egressing the network. Each node-PoP pair is tested sequentially
meaning the total test duration is bounded by the number of sites in the
network.

Multihop testing can be done using TCP or UDP. If no protocol is provided, TCP
is chosen and an omit period of two seconds is used to ignore TCP slowstart
when processing the results. In addition, a default session duration of one
minute is used if one is not provided.

### Parallel Link Test
Start bidirectional UDP `iperf` sessions on all wireless links in a given
network simultaneously. A session duration of five minutes is used if one is
not provided.

### Sequential Link Test
Start bidirectional UDP `iperf` sessions on each wireless link in a given
network sequentially. A session duration of one minute is used if one is not
provided.
