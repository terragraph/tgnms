/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import * as React from 'react';
import {getUIEnvVal} from '../../common/uiConfig';

/**
 * Creates a link to a grafana dashboard with templated variables filled in.
 * Example:
 * <GrafanaLink dashboard="dash_uuid" vars={{'var-network': 'Tower C'}}>
 *  Link to dashboard
 * </GrafanaLink>
 *
 * will produce:
 * <a href="http://GRAFANA_URL/d/dash_uuid?var-network=Tower C">...
 */

/*
 * The UUID of the dashboard you're trying to link to. For example:
 * http://my_grafana/d/link_prom/...
 * link_prom would be the UUID.
 * Note:
 * If the UUID looks randomly generated like lAfo6rkZz - *Do not link to it*
 * It will need a predefined UUID to prevent broken links.
 */
export const GrafanaDashboardUUID = {
  link: 'link_prom',
};

export type Props = {
  dashboard: $Values<typeof GrafanaDashboardUUID>,
  component?: string | React.ComponentType<any>,
  children: React.Node,
  /*
   * vars used to query grafana and do not need special formatting
   */
  vars?: {[string]: string},
  /*
   * vars used to query prometheus and require special formatting
   */
  prometheusVars?: {[string]: string},
};

export default function GrafanaLink({
  children,
  component,
  dashboard,
  vars,
  prometheusVars,
  ...props
}: Props) {
  const href = React.useMemo(() => {
    return buildGrafanaUrl(dashboard, prometheusVars, vars);
  }, [dashboard, prometheusVars, vars]);

  const Component = component || DefaultLink;
  return <Component {...props} href={href} children={children} />;
}

export function buildGrafanaUrl(
  dashboard: $Values<typeof GrafanaDashboardUUID>,
  prometheusVars?: {[string]: string},
  vars?: {[string]: string},
) {
  const grafanaBaseUrl = getUIEnvVal('GRAFANA_URL');
  let baseUrl: URL;
  try {
    baseUrl = new URL(grafanaBaseUrl);
  } catch (err) {
    baseUrl = new URL('/grafana', window.location.origin);
  }
  if (dashboard && dashboard.trim() !== '') {
    baseUrl.pathname += `/d/${dashboard}`;
  }
  if (vars) {
    for (const [key, val] of Object.entries(vars)) {
      const v = (val: any);
      baseUrl.searchParams.append(key, v);
    }
  }
  if (prometheusVars) {
    for (const [key, val] of Object.entries(prometheusVars)) {
      const v = formatPrometheusVal((val: any));
      baseUrl.searchParams.append(key, v);
    }
  }
  return baseUrl.toString();
}

function DefaultLink(
  props: $Rest<HTMLAnchorElement, {|children: HTMLCollection<HTMLElement>|}> & {
    children: React.Node,
  },
) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

/*
 * converts a string to adhere to prometheus's data model
 * https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
 */
export function formatPrometheusVal(value: string) {
  /*
   * This regex matches any character which is NOT a
   * letter, number, underscore or colon.
   */
  const prometheusValueRegex = /([^a-zA-Z0-9_:])/g;
  return value.replace(prometheusValueRegex, '_');
}
