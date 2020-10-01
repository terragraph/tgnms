# Scan Service
`scan_service` enables scheduling and running network-wide interference scans
on Terragraph networks followed by analysis and storage of the scan data.

## Supported Analyses
Two types of analyses are performed on the scan data. Interference analysis
and Connectivity analysis. The analyses are performed on current scan results
as well as `n_day` aggregated scan results.

### Interference Analysis
The interference analysis returns the total interference on the receive side
of all links as well as the names and INRs of the interfering links.

### Connectivity Analysis
The connectivity analysis finds all pairs of nodes that have above `target`
SNR towards each other at max transmit power.
