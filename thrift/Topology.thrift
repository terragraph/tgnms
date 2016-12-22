namespace php CXL_Terragraph
namespace py terragraph_thrift.Topology

enum NodeType {
    CN = 1
    DN = 2
}

enum PolarityType {
    ODD = 1
    EVEN = 2
}

enum LinkType {
    WIRELESS = 1
    ETHERNET = 2
}

struct GolayIdx {
  1: i64 txGolayIdx
  2: i64 rxGolayIdx
}

struct Location {
    2: double latitude
    3: double longitude
    4: double altitude
}

struct Site {
    1: string name
    2: Location location
}

struct Node {
    1: string name
    2: NodeType node_type
    3: bool is_primary
    4: string mac_addr
    5: bool pop_node
    6: bool is_ignited  # modified by controller
    7: optional PolarityType polarity
    8: optional GolayIdx golay_idx # default golay for all links from this node
    100: string site_name  # not used in e2e
    101: double ant_azimuth  # not used in e2e
    102: double ant_elevation  # not used in e2e
}

struct Link {
    1: string name
    2: string a_node_name
    3: string z_node_name
    4: LinkType link_type
    5: bool is_alive  # modified by controller
    6: i64 linkup_attempts  # modified by controller
    7: optional GolayIdx golay_idx # link specific golay index
}

struct Topology {
    1: string name
    2: list<Node> nodes
    3: list<Link> links
    4: list<Site> sites
}
