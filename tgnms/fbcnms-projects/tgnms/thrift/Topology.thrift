# Copyright (c) 2014-present, Facebook, Inc.
namespace php CXL_Terragraph
namespace py terragraph_thrift.Topology
namespace cpp facebook.terragraph.thrift

enum NodeType {
    CN = 1,
    DN = 2,
}

enum PolarityType {
    ODD = 1,
    EVEN = 2,
    HYBRID_ODD = 3,
    HYBRID_EVEN = 4,
}

enum LinkType {
    WIRELESS = 1,
    ETHERNET = 2,
}

/**
 * @apiDefine GolayIdx_GROUP
 * @apiParam (:GolayIdx) {Int64} txGolayIdx The tx golay index
 * @apiParam (:GolayIdx) {Int64} rxGolayIdx The rx golay index
 */
struct GolayIdx {
    1: i64 txGolayIdx
    2: i64 rxGolayIdx
}

/**
 * @apiDefine Location_GROUP
 * @apiParam (:Location) {Double} latitude The latitude
 * @apiParam (:Location) {Double} longitude The longitude
 * @apiParam (:Location) {Double} altitude The altitude (in meters)
 * @apiParam (:Location) {Double} accuracy=40000000 The order of size of earth
 */
struct Location {
    2: double latitude = 0
    3: double longitude = 0
    4: double altitude = 0
    # default value of accuracy set to 40Mm
    # order of size of earth
    5: double accuracy = 40000000
}

/**
 * @apiDefine Site_GROUP
 * @apiParam (:Site) {String} name The site name
 * @apiParam (:Site) {Object(Location)} location The site location
 */
struct Site {
    1: string name
    2: Location location
}

# Typical DN's Lifecycle:
#     OFFLINE -> ONLINE (message exchange with controller)
#             -> ONLINE_INITIATOR (GPS enabled, can act as an initiator)
# Typical CN's Lifecycle:
#     OFFLINE -> ONLINE (message exchange with controller)
enum NodeStatusType {
    OFFLINE = 1,
    ONLINE = 2,
    ONLINE_INITIATOR = 3,  # node is online and can act as an initiator
}

/**
 * @apiDefine Node_GROUP
 * @apiParam (:Node) {String} name The node name
 * @apiParam (:Node) {Int(NodeType)=1,2} node_type The type of node (1=CN, 2=DN)
 * @apiParam (:Node) {Boolean} is_primary Whether the node is primary
 * @apiParam (:Node) {String} mac_addr The MAC address (can be left blank)
 * @apiParam (:Node) {Boolean} pop_node Whether the node is connected to a POP
 * @apiParam (:Node) {Int(PolarityType)=1,2,3,4} [polarity]
 *                   The polarity (1=ODD, 2=EVEN, 3=HYBRID_ODD, 4=HYBRID_EVEN)
 * @apiParam (:Node) {Object(GolayIdx)} [golay_idx]
 *                   The link-specific golay index
 * @apiParam (:Node) {Int(NodeStatusType)=1,2,3} status The node status
 *                   (1=OFFLINE, 2=ONLINE, 3=ONLINE_INITIATOR)
 * @apiParam (:Node) {String} site_name The site name
 * @apiParam (:Node) {Double} ant_azimuth The antenna azimuth
 * @apiParam (:Node) {Double} ant_elevation The antenna elevation
 * @apiParam (:Node) {Boolean} [has_cpe]
 *                   Whether the node is attached to a customer
 */
struct Node {
    1: string name
    2: NodeType node_type
    3: bool is_primary
    4: string mac_addr
    5: bool pop_node
    7: optional PolarityType polarity
    8: optional GolayIdx golay_idx # default golay for all links from this node
    9: NodeStatusType status  # modified by controller
    100: string site_name
    101: double ant_azimuth  # not used in e2e
    102: double ant_elevation  # not used in e2e
    103: optional bool has_cpe  # node has attached CPE
}

/**
 * @apiDefine Link_GROUP
 * @apiParam (:Link) {String} name The link name
 * @apiParam (:Link) {String} a_node_name The A-node name
 * @apiParam (:Link) {String} z_node_name The Z-node name
 * @apiParam (:Link) {Int(LinkType)=1,2} link_type
 *                   The link type (1=WIRELESS, 2=ETHERNET)
 * @apiParam (:Link) {Boolean} is_alive The alive state (initialize to false)
 * @apiParam (:Link) {Int64} linkup_attempts
 *                   The link-up attempts (initialize to 0)
 * @apiParam (:Link) {Object(GolayIdx)} [golay_idx]
 *                   The link-specific golay index
 * @apiParam (:Link) {Int64} [control_superframe]
 *                   The control superframe for the link
 */
struct Link {
    1: string name
    2: string a_node_name
    3: string z_node_name
    4: LinkType link_type
    5: bool is_alive  # modified by controller
    6: i64 linkup_attempts  # modified by controller
    7: optional GolayIdx golay_idx # link specific golay index
    8: optional i64 control_superframe # control superframe for the link
    9: string a_node_mac
    10: string z_node_mac
    11: optional bool is_backup_cn_link
}

struct Config {
    1: i8 channel = 2
}

struct Topology {
    1: string name
    2: list<Node> nodes
    3: list<Link> links
    4: list<Site> sites
    5: Config config
}
