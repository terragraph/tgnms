/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import Grid from '@material-ui/core/Grid';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import SettingsEthernetIcon from '@material-ui/icons/SettingsEthernet';
import StarIcon from '@material-ui/icons/Star';
import blue from '@material-ui/core/colors/blue';
import yellow from '@material-ui/core/colors/yellow';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useNodeConfig} from '@fbcnms/tg-nms/app/hooks/useNodeConfig';

import type {NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

const useStyles = makeStyles(theme => ({
  nodeInfoIcon: {
    marginTop: -theme.spacing(2.25),
  },
  primaryPopStar: {
    fontSize: theme.spacing(1.5),
    marginBottom: -theme.spacing(1.75),
    marginLeft: -theme.spacing(0.25),
    color: yellow[800],
  },
  tunnelIcon: {
    fontSize: theme.spacing(1.5),
    marginBottom: -theme.spacing(1.75),
    marginLeft: -theme.spacing(0.25),
    color: blue[500],
  },
}));

type Props = {
  selectedNode?: NodeType,
};

export default function SiteDetailsNodeIcon(props: Props) {
  const classes = useStyles();
  const {selectedNode} = props;
  const {networkConfig} = useNetworkContext();
  const {status_dump} = networkConfig;
  const nodeName = selectedNode?.name ?? '';

  const {configParams} = useNodeConfig({
    nodeName: selectedNode?.name,
    editMode: FORM_CONFIG_MODES.NODE,
  });

  const nodeConfig = React.useMemo(
    () =>
      configParams.nodeOverridesConfig
        ? configParams.nodeOverridesConfig[nodeName]
        : {},
    [nodeName, configParams],
  );

  if (
    selectedNode &&
    status_dump &&
    status_dump.statusReports[selectedNode.mac_addr] &&
    status_dump.statusReports[selectedNode.mac_addr].bgpStatus
  ) {
    return (
      <Grid
        data-testid="bgpStatusIcon"
        className={classes.nodeInfoIcon}
        title="BGP Speaker">
        <Grid item>
          <StarIcon className={classes.primaryPopStar} />
        </Grid>
        <Grid item>
          <RouterIcon />
        </Grid>
      </Grid>
    );
  } else if (nodeConfig && Object.keys(nodeConfig).includes('tunnelConfig')) {
    return (
      <Grid
        data-testid="tunnelConfigIcon"
        className={classes.nodeInfoIcon}
        title="Active L2 Tunnel">
        <Grid item>
          <SettingsEthernetIcon className={classes.tunnelIcon} />
        </Grid>
        <Grid item>
          <RouterIcon />
        </Grid>
      </Grid>
    );
  }
  return <RouterIcon data-testid="routerIcon" />;
}
