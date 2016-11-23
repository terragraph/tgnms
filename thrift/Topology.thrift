namespace cpp2 facebook.terragraph.thrift
namespace php CXL_Terragraph
namespace py terragraph_thrift.Controller

enum NodeType {
    CN = 1
    DN = 2
    POP = 3
}

enum PolarityType {
    ODD = 1
    EVEN = 2
}

enum LinkType {
    WIRELESS = 1
    ETHERNET = 2
}

struct Site {
    1: string name
    2: double latitude
    3: double longitude
    4: double altitude
}

struct Node {
    1: string name
    2: NodeType node_type
    3: optional bool is_primary
    4: string mac_addr
    5: bool pop_node
    6: optional bool is_ignited  # modified by controller
    7: optional PolarityType polarity
    100: optional string site_name  # not used in e2e
    101: optional double ant_azimuth  # not used in e2e
    102: optional double ant_elevation  # not used in e2e
}

struct Link {
    1: string name
    2: string a_node_name
    3: string z_node_name
    4: LinkType link_type
    5: optional bool is_alive  # modified by controller
    6: optional i64 linkup_attempts  # modified by controller
}

struct Topology {
    1: string name
    2: list<Node> nodes
    3: list<Link> links
    4: list<Site> sites
}
