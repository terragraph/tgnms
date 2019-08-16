// @flow

// Generated by thrift2flow at Mon Apr 08 2019 21:30:01 GMT-0700 (PDT)

export type NodeTypeType = "CN" | "DN";
export const NodeTypeValueMap = {
  CN: 1,
  DN: 2
};

export type PolarityTypeType = "ODD" | "EVEN" | "HYBRID_ODD" | "HYBRID_EVEN";
export const PolarityTypeValueMap = {
  ODD: 1,
  EVEN: 2,
  HYBRID_ODD: 3,
  HYBRID_EVEN: 4
};

export type LinkTypeType = "WIRELESS" | "ETHERNET";
export const LinkTypeValueMap = {
  WIRELESS: 1,
  ETHERNET: 2
};

export type GolayIdxType = {| txGolayIdx: number, rxGolayIdx: number |};

export type LocationType = {|
  latitude: number,
  longitude: number,
  altitude: number,
  accuracy: number
|};

export type SiteType = {| name: string, location: LocationType |};

export type NodeStatusTypeType = "OFFLINE" | "ONLINE" | "ONLINE_INITIATOR";
export const NodeStatusTypeValueMap = {
  OFFLINE: 1,
  ONLINE: 2,
  ONLINE_INITIATOR: 3
};

export type NodeType = {|
  name: string,
  node_type: $Values<typeof NodeTypeValueMap>,
  is_primary: boolean,
  mac_addr: string,
  pop_node: boolean,
  polarity?: PolarityTypeType,
  golay_idx?: GolayIdxType,
  status: $Values<typeof NodeStatusTypeValueMap>,
  site_name: string,
  ant_azimuth: number,
  ant_elevation: number,
  has_cpe?: boolean
|};

export type LinkType = {|
  name: string,
  a_node_name: string,
  z_node_name: string,
  link_type: $Values<typeof LinkTypeValueMap>,
  is_alive: boolean,
  linkup_attempts: number,
  golay_idx?: GolayIdxType,
  control_superframe?: number,
  a_node_mac: string,
  z_node_mac: string,
  is_backup_cn_link?: boolean
|};

export type ConfigType = {| channel: number |};

export type TopologyType = {
  name: string,
  nodes: NodeType[],
  links: LinkType[],
  sites: SiteType[],
  config: ConfigType
};
