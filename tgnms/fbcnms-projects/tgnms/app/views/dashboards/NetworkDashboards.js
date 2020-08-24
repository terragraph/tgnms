/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  GrafanaDashboardUUID,
  buildGrafanaUrl,
} from '../../components/common/GrafanaLink';
import {STATS_LINK_QUERY_PARAM} from '../../constants/ConfigConstants';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

const styles = () => ({
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
  },
  dashboardsIframe: {
    width: '100%',
    border: 0,
  },
});

type Props = {
  classes: {[string]: string},
  networkName: string,
};

class NetworkDashboards extends React.Component<Props> {
  render() {
    const {classes, networkName} = this.props;
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
        {...options, refresh: '30'},
      );
    }
    return (
      <div className={classes.root}>
        <iframe src={grafanaUrl} className={classes.dashboardsIframe} />
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: false})(
  withRouter(NetworkDashboards),
);
