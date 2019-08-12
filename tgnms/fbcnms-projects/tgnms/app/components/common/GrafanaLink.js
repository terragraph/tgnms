/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Creates a link to a grafana dashboard with templated variables filled in.
 * Example:
 * <GrafanaLink dashboard="dash_uuid" vars={{'var-network': 'Tower C'}}>
 *  Link to dashboard
 * </GrafanaLink>
 *
 * will produce:
 * <a href="http://GRAFANA_URL/d/dash_uuid?var-network=Tower C">...
 */

import * as React from 'react';

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
  children: any,
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
  const grafanaBaseUrl = window.CONFIG.env.GRAFANA_URL;
  const href = React.useMemo(() => {
    const baseUrl = new URL(grafanaBaseUrl);
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
  }, [dashboard, grafanaBaseUrl, prometheusVars, vars]);

  const Component = component || DefaultLink;
  return <Component {...props} href={href} children={children} />;
}

function DefaultLink(props: $Shape<HTMLAnchorElement>) {
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
