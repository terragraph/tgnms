/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

export type Golay = {
  txGolayIdx: number,
  rxGolayIdx: number,
};

export type Location = {
  latitude: number,
  longitude: number,
  altitude?: number,
  accuracy?: number,
};

export type Node = {
  name: string,
  node_type: number,
  is_primary: boolean,
  mac_addr: string,
  pop_node: boolean,
  polarity: number,
  golay_idx: Golay,
  status: number,
  secondary_mac_addrs: Array<string>,
  site_name: string,
  ant_azimuth?: number,
  ant_elevation?: number,
  has_cpe?: boolean,
  prefix?: string,
};

export type Link = {
  name: string,
  a_node_name: string,
  z_node_name: string,
  link_type: number,
  is_alive: boolean,
  linkup_attempts: number,
  golay_idx?: Golay,
  control_superframe?: number,
  a_node_mac: string,
  z_node_mac: string,
};

export type Site = {
  name: string,
  location: Location,
};

export type PrefixAllocParams = {
  seed_prefix: string,
  alloc_prefix_len?: number,
};

export type Config = {
  channel: number,
  prefix_alloc_params?: PrefixAllocParams,
};

export type Topology = {
  name: string,
  nodes: Array<Node>,
  links: Array<Link>,
  sites: Array<Site>,
  config: Config,
};
