/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

// static JSON OpenAPI files
const STATIC_PATH = '/static/doc';
// Yaml files stored in the NMS's /static/doc dir. transformed to JSON
const STATIC_YAML_PATH = '/docs/yaml';
// Proxies into the internal docker network to serve an internal service's docs
// eslint-disable-next-line no-unused-vars
const MSA_DOCS_PATH = '/docs/msa';

export const OPENAPI_URLS = [
  {
    url: `${STATIC_PATH}/swagger.json`,
    name: 'NMS',
  },
  {
    url: `${STATIC_YAML_PATH}/network_test.yml`,
    name: 'Network Test',
  },
];
