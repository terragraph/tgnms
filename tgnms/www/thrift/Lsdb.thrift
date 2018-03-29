namespace py terragraph.aquaman.Lsdb

include "IpPrefix.thrift"

// describes a specific adjacency to a neighbor node
struct Adjacency {
  // must match a name bound to another node
  1: string otherNodeName

  // interface for the peer
  2: string ifName

  // peer's link-local addresses
  3: IpPrefix.BinaryAddress nextHopV6
  5: IpPrefix.BinaryAddress nextHopV4

  // metric to reach to the neighbor
  4: i32 metric

  // SR Adjacency Segment label associated with this adjacency. This is
  // node-local label and programmed by originator only assigned from
  // non-global space. 0 is invalid value
  6: i32 adjLabel = 0

  // Overloaded bit for adjacency. Indicates that this adjacency is not
  // available for any kind of transit traffic
  7: bool isOverloaded = 0

  // rtt to neighbor in us
  8: i32 rtt
}

// full link state information of a single router
// announced under keys starting with "adjacencies:"
struct AdjacencyDatabase {
  // must use the same name as used in the key
  1: string thisNodeName

  // overload bit. Indicates if node should be use for transit(false)
  // or not(true).
  2: bool isOverloaded = 0

  // all adjacent neighbors for this node
  3: list<Adjacency> adjacencies

  // SR Nodal Segment label associated with this node. This is globally unique
  // label assigned from global static space. 0 is invalid value
  4: i32 nodeLabel
}

// all prefixes that are bound to a given router
// announced under keys starting with "prefixes:"
struct PrefixDatabase {
  // must be the same as used in the key
  1: string thisNodeName

  // all routable prefixes connected to this node
  2: list<IpPrefix.IpPrefix> prefixes
}
