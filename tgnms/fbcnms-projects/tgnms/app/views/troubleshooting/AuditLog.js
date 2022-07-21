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
import {getUIEnvVal} from '../../common/uiConfig';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(() => ({
  dashboardsIframe: {
    width: '100%',
    height: '100%',
    border: 0,
  },
}));

export default function AuditLog() {
  const classes = useStyles();
  const kibanaBaseUrlRef = React.useRef(getUIEnvVal('KIBANA_URL'));

  const kibanaUrl = `${kibanaBaseUrlRef.current}/app/kibana#/discover?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-1d,to:now))`;

  return (
    <iframe
      data-testid="log-iframe"
      src={kibanaUrl}
      className={classes.dashboardsIframe}
    />
  );
}
