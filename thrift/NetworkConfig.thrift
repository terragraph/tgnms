include "Topology.thrift"

# list the available configs for the UI

struct NetworkConfig {
  1: Topology.Topology topology

  // map defaults - center coordinates
  10: double latitude,
  11: double longitude
  12: i64 zoom_level

  // status information
  100: string controller_ip
}

struct NetworkConfigs {
  # First topology is the default
  1: list<NetworkConfig> topologies
}
