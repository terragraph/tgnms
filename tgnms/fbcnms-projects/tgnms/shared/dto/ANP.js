/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

/**
 * Using the file handle (h) returned by the last chunk upload,
 * associate it with ANP and add some metadata.
 */
export type ANPFileHandleRequest = {|
  file_name: string,
  file_extension: string,
  file_role: string,
  file_handle: string,
|};

export type ANPFileHandle = {|
  file_name: string,
  file_extension: string,
  file_role: string,
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
  [OUTPUT_FILE.SITES_OPTIMIZED_CSV]:
    '(6_Report KPIs & Financial Metrics) sites_optimized_csv',
  [OUTPUT_FILE.LINKS_OPTIMIZED_CSV]:
    '(6_Report KPIs & Financial Metrics) links_optimized_csv',
  [OUTPUT_FILE.METRICS_OPTIMIZED_PLAN_TXT]:
    '(6_Report KPIs & Financial Metrics) metrics_optimized_plan_txt',
  [OUTPUT_FILE.NODES_OPTIMIZED_CSV]:
    '(6_Report KPIs & Financial Metrics) nodes_optimized_csv',
  [OUTPUT_FILE.REPORTING_GRAPH_JSON]:
    '(6_Report KPIs & Financial Metrics) reporting_graph_json',
  [OUTPUT_FILE.REPORTING_GRAPH_KML]:
    '(6_Report KPIs & Financial Metrics) reporting_graph_kml',
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

export type CreateANPPlanRequest = {|
  folder_id: string,
  plan_name: string,
  boundary_polygon: string,
  dsm: string,
  site_list: string,
|};

export type LaunchANPPlanResponse = {|
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
