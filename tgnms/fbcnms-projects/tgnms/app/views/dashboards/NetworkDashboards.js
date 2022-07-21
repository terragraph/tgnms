/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  GrafanaDashboardUUID,
  buildGrafanaUrl,
} from '@fbcnms/tg-nms/app/components/common/GrafanaLink';
import {STATS_LINK_QUERY_PARAM} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
  },
  dashboardsIframe: {
    width: '100%',
    border: 0,
  },
}));

export default function NetworkDashboards() {
  const classes = useStyles();
  const {networkName} = useNetworkContext();

  let grafanaUrl = '';

  const options = {theme: 'light', kiosk: 'tv', orgId: '1'};
  const params = new URLSearchParams(window.location.search);
  const linkName = params.get(STATS_LINK_QUERY_PARAM) || '';
  if (linkName != '') {
    grafanaUrl = buildGrafanaUrl(
      GrafanaDashboardUUID.link,
      {'var-network': networkName, 'var-link_name': linkName},
      options,
    );
  } else {
    grafanaUrl = buildGrafanaUrl(
      GrafanaDashboardUUID.network,
      {'var-network': networkName},
      {...options, refresh: '30s'},
    );
  }

  return (
    <div className={classes.root}>
      <iframe src={grafanaUrl} className={classes.dashboardsIframe} />
    </div>
  );
}
