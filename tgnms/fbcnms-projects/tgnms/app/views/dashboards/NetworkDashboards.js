/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
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

const {GRAFANA_URL} = window.CONFIG.env;

class NetworkDashboards extends React.Component<Props> {
  render() {
    const {classes, networkName} = this.props;
    const grafanaUrl = `${GRAFANA_URL}network-health?orgId=1&var-networkName=${networkName}&theme=light&kiosk=tv`;
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
