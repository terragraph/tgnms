namespace php CXL_Terragraph
namespace py terragraph_thrift.Controller
include "Topology.thrift"

# list the available configs for the UI

struct NetworkConfig {
  1: string topology_file

  // map defaults - center coordinates
  10: double latitude
  11: double longitude
  12: i64 zoom_level

  // status information
  100: string controller_ip
}

struct NetworkConfigs {
  # First topology is the default
  1: list<NetworkConfig> topologies
}
