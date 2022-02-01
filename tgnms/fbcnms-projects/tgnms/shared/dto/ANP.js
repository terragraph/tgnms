/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */

/**
 * Using the file handle (h) returned by the last chunk upload,
 * associate it with ANP and add some metadata.
 */
export type ANPFileHandleRequest = {|
  file_name: string,
  file_extension: string,
  file_role: FileRoles,
  file_handle: string,
|};

export type ANPFileHandle = {|
  file_name: string,
  file_extension: string,
  file_role: FileRoles,
  file_status: string,
  id: string,
|};

export type ANPFolder = {|
  folder_name: string,
  folder_description: string,
  id: string,
|};

export const PLAN_STATUS = {
  IN_PREPARATION: 'IN_PREPARATION',
  SUCCEEDED: 'SUCCEEDED',
  RUNNING: 'RUNNING',
  SCHEDULED: 'SCHEDULED',
  FAILED: 'FAILED',
  KILLED: 'KILLED',
};
export type PlanStatus = $Keys<typeof PLAN_STATUS>;

export const OUTPUT_FILE = {
  SITES_OPTIMIZED_CSV: 'SITES_OPTIMIZED_CSV',
  LINKS_OPTIMIZED_CSV: 'LINKS_OPTIMIZED_CSV',
  METRICS_OPTIMIZED_PLAN_TXT: 'METRICS_OPTIMIZED_PLAN_TXT',
  NODES_OPTIMIZED_CSV: 'NODES_OPTIMIZED_CSV',
  REPORTING_GRAPH_JSON: 'REPORTING_GRAPH_JSON',
  REPORTING_GRAPH_KML: 'REPORTING_GRAPH_KML',
};
/**
 * Map from OUTPUT_FILE to the file_name field returned by the reporting api
 */
export const OUTPUT_FILENAME = {
  [OUTPUT_FILE.SITES_OPTIMIZED_CSV]: 'sites_optimized_csv',
  [OUTPUT_FILE.LINKS_OPTIMIZED_CSV]: 'links_optimized_csv',
  [OUTPUT_FILE.METRICS_OPTIMIZED_PLAN_TXT]: 'metrics_optimized_plan_txt',
  [OUTPUT_FILE.NODES_OPTIMIZED_CSV]: 'nodes_optimized_csv',
  [OUTPUT_FILE.REPORTING_GRAPH_JSON]: 'reporting_graph_json',
  [OUTPUT_FILE.REPORTING_GRAPH_KML]: 'reporting_graph_kml',
};

export type OutputFileKey = $Keys<typeof OUTPUT_FILE>;

export type ANPPlan = {|
  id: string,
  plan_name: string,
  plan_status: PlanStatus,
|};
export type ANPPlanError = {|
  error_message: string,
|};
export type ANPPlanMetrics = {|
  metrics: Array<ANPMetricContainer>,
|};
export type ANPMetricContainer = {|
  metric: ANPMetric,
  value: ANPMetricValue,
|};
export type ANPMetric = {|
  metric_type: string,
  cut_type: string,
  cut_value: string,
  order: string,
|};
export type ANPMetricValue = {|value: number, missing_data: boolean|};

export type CreateANPPlanRequest = {|
  folder_id: string,
  plan_name: string,
  boundary_polygon: string,
  dsm: string,
  site_list: string,
  device_list_file?: ?string,
|};

// launch/cancel both return just a success message
export type ANPCommandResponse = {|
  success: boolean,
|};

export type GraphQueryResponse<T> = {|
  data: Array<T>,
  paging: {
    cursors: {
      before: string,
      after: string,
    },
    next: string,
  },
|};
/**
 * ANP
 */
export const FILE_ROLE = {
  NON_INPUT: 'NON_INPUT',
  BOUNDARY_FILE: 'BOUNDARY_FILE',
  FIBER_ROW_WKT: 'FIBER_ROW_WKT',
  FIBER_ROW_SOURCE: 'FIBER_ROW_SOURCE',
  FIBER_SITE_FILE: 'SITE_FILE',
  FIBER_COST_MODEL_JSON_FILE: 'COST_MODEL_JSON_FILE',
  FIBER_SITE_VALUE_MODEL_JSON_FILE: 'SITE_VALUE_MODEL_JSON_FILE',
  MICROWAVE_TOWER_FILE: 'MICROWAVE_TOWER_FILE',
  MICROWAVE_EQUIPMENT_JSON: 'MICROWAVE_EQUIPMENT_JSON',
  MICROWAVE_DIMENSIONING_PARAMS_JSON: 'MICROWAVE_DIMENSIONING_PARAMS_JSON',
  MICROWAVE_FINANCIAL_PARAMS_JSON: 'MICROWAVE_FINANCIAL_PARAMS_JSON',
  MICROWAVE_SATELLITE_PARAMS_JSON: 'MICROWAVE_SATELLITE_PARAMS_JSON',
  MICROWAVE_COVERAGE_PREDICTION_PARAMS_JSON:
    'MICROWAVE_COVERAGE_PREDICTION_PARAMS_JSON',
  MICROWAVE_ANTENNA_PATTERN: 'MICROWAVE_INPUT_ANTENNA_PATTERN',
  HUMAN_INPUT: 'HUMAN_INPUT',
  URBAN_SITE_FILE: 'URBAN_SITE_FILE',
  URBAN_TOPOLOGY_JSON: 'URBAN_TOPOLOGY_JSON',
  URBAN_TOPOLOGY_KML: 'URBAN_TOPOLOGY_KML',
  URBAN_DEVICE_LIST_JSON: 'URBAN_DEVICE_LIST_JSON',
  DTM_GEOTIFF: 'DTM_GEOTIFF',
  DHM_GEOTIFF: 'DHM_GEOTIFF',
  DSM_GEOTIFF: 'DSM_GEOTIFF',
  DLU_GEOTIFF: 'DLU_GEOTIFF',
  DLU_CLASSIFICATIONS: 'DLU_CLASSIFICATIONS',
  BUILDING_SHP_FILE: 'BUILDING_SHP_FILE',
  MCS_MAPPING: 'MCS_MAPPING',
  ANGLE_COST_MODEL_JSON: 'ANGLE_COST_MODEL_JSON',
  MANHOLE_HANDHOLE: 'MANHOLE_HANDHOLE',
  TELEPORT_FILE: 'TELEPORT_FILE',
  DATA_INGESTION_PARAMS_JSON: 'DATA_INGESTION_PARAMS_JSON',
  URBAN_ASP_CANDIDATE_SITE_FILE: 'URBAN_ASP_CANDIDATE_SITE_FILE',
};

export type FileRoles = $Keys<typeof FILE_ROLE>;

export const METRIC_TYPE = {
  ACTIVE_DN_DN_LINKS: 'Active DN-DN Links',
  ACTIVE_SECTORS: 'Active Sectors',
  ADDITIONAL_TCO: 'Additional TCO',
  AVAILABILITY: 'Availability',
  AVERAGE_HOPS: 'Average Hops',
  AVERAGE_LINK_CAPACITY_UTILIZATION: 'Average Link Capacity Utilization',
  AVERAGE_ONE_WAY_LATENCY: 'Average One-Way Latency',
  CN_NODES: 'CN Nodes',
  CN_SITES: 'CN Sites',
  CAPEX_PER_CN_CONNECTED: 'CapEx Per CN Connected',
  CAPEX: 'CapEx',
  DN_NODES: 'DN Nodes',
  DN_SITES: 'DN Sites',
  DN_DN_LINK_DISTANCE: 'DN-DN Link Distance',
  DEMAND_LOCATIONS: 'Demand Locations',
  MAXIMUM_HOPS: 'Maximum Hops',
  MAXIMUM_LINK_CAPACITY_UTILIZATION: 'Maximum Link Capacity Utilization',
  MAXIMUM_ONE_WAY_LATENCY: 'Maximum One-Way Latency',
  MINIMUM_HOPS: 'Minimum Hops',
  MINIMUM_LINK_CAPACITY_UTILIZATION: 'Minimum Link Capacity Utilization',
  MINIMUM_ONE_WAY_LATENCY: 'Minimum One-Way Latency',
  P2MP_LINKS: 'P2MP Links',
  POP_SITES: 'POP Sites',
  PERCENT_DEMAND_WITH_BANDWIDTH: 'Percent Demand with Bandwidth',
  SINGLE_DN_SITE_FIALURE_DISRUPTION: 'Single DN Site Fialure Disruption',
  SINGLE_LINK_FAILURE_DISRUPTION: 'Single Link Failure Disruption',
  SINGLE_POP_SITE_FAILURE_DISRUPTION: 'Single POP Site Failure Disruption',
  TCO: 'TCO',
  TOTAL_BANDWIDTH_REQUIRED: 'Total Bandwidth Required',
  MINIMUM_GUARANTEED_BANDWIDTH: 'Minimum Guaranteed Bandwidth',
  TOTAL_LINKS: 'Total Links',
  TOTAL_NETWORK_BANDWIDTH: 'Total Network Bandwidth',
  TOTAL_NODES: 'Total Nodes',
  TOTAL_SECTORS: 'Total Sectors',
  TOTAL_SITES: 'Total Sites',
  WIRED_LINKS: 'Wired Links',
  WIRELESS_LINKS: 'Wireless Links',
};

export const CUT_TYPE = {
  DEMAND_FEATURE: 'Demand Feature',
  INCLUDE_EXISTING_NETWORK: 'Include Existing Network',
  INCLUDE_OVERSUBSCRIPTION: 'Include Oversubscription',
  MCS: 'MCS',
  PERCENTAGE_OF_DEMAND_LOCATIONS: 'Percentage of Demand Locations',
  ROUTING_TYPE: 'Routing Type',
  SECTOR_TYPE: 'Sector Type',
  STATISTICAL_MEASUREMENT: 'Statistical Measurement',
  STATUS: 'Status',
  TOPLINE: 'Topline',
  YEAR: 'Year',
};

export const INPUT_FILE_STATE = {READY: 'READY'};

export type MeshPlannerDeviceParams = {|
  device_sku: string,
  device_type: 1 | 2, // shared/types/Topology.js - NodeTypeValueMap
  node_capex: number,
  number_of_boxes_per_site: number,
  mcs_mapping_file_id?: ?string,
  sector_params: MeshPlannerSectorParams,
|};

// https://fburl.com/code/h310huf4
/* eslint-disable max-len */
export type MeshPlannerSectorParams = {|
  radiation_pattern?: ?string, // antenna radiation pattern (e.g. omni)
  mechanical_downtilt_deg?: ?number, // mechanical tilt [deg positive down]
  electrical_downtilt_deg?: ?number, // electrical tilt [deg positive down]
  antenna_boresight_gain_dbi?: ?number, // antenna gain at boresight [dBi]
  beamwidth_el_deg?: ?number, // antenna beamwith in vertical plane [deg]
  beamwidth_az_deg?: ?number, // antenna beamwidth in horizontal plane [deg]
  boresight_az_deg?: ?number, // boresight angle in horizontal plane
  install_height_m?: ?number, // install height of antenna [m above ground]
  carrier_frequency_mhz?: ?number, // carrier frequency (center of band) [MHz]
  channel_bandwidth_mhz?: ?number, // channel bandwidth [MHz]
  tx_power_dbm?: ?number, // transmit power [dBm]
  noise_db?: ?number, // noise figure [dB]
  tx_diversity_gain_db?: ?number, // transmit diversity gain [dB]
  rx_diversity_gain_db?: ?number, // receive diversity gain [dB]
  tx_misc_loss_db?: ?number, // miscellaneous transmit losses [dB]
  rx_misc_loss_db?: ?number, // miscellaneous receive losses [dB]
  antenna_loading?: ?AntennaLoading, // antenna loading specs
  antenna_pattern_handle?: ?string, // FBID of the antenna_pattern file
  thermal_noise_dbm?: ?number, // thermal noise [dBm]
  mcs_mapping_handle?: ?string, // FBID of the mcs_mapping file
  external_antenna_pattern_name?: ?string, // name of manual antenna pattern
  install_height_to_tower_height_m?: ?number, // antenna height relative to the height of the tower
  rain_loss_db_km?: ?number, // Losses per km for rain and watersheeting
  num_sectors_per_box: number, // For Terragraph, how many sectors in a box. Ignore if for ASP.
  min_tx_power_dbm?: ?number, // minimum transmit power [dBm]
  min_mcs: number, // Minimum mcs 0
  max_tx_power_dbm?: ?number, // maximum transmit power [dBm]
  scan_range_az_deg?: ?number, // scan range in horizontal plane [deg]
|};
export type AntennaLoading = {|
  windload: number, //newtons
  windspeed: number, //kmph
|};

/* eslint-enable max-len */
