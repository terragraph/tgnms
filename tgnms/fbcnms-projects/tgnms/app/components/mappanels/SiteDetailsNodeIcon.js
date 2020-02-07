/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import Grid from '@material-ui/core/Grid';
import NetworkContext from '../../NetworkContext';
import React, {useContext} from 'react';
import RouterIcon from '@material-ui/icons/Router';
import StarIcon from '@material-ui/icons/Star';
import yellow from '@material-ui/core/colors/yellow';
import {makeStyles} from '@material-ui/styles';
import type {NetworkContextType} from '../../NetworkContext';
import type {NodeType} from '../../../shared/types/Topology';

const styles = {
  primaryPopIcon: {
    marginTop: '-18px',
  },
  primaryPopStar: {
    fontSize: '12px',
    marginBottom: '-14px',
    color: yellow[800],
  },
};

const useStyles = makeStyles(styles);

type Props = {
  selectedNode?: NodeType,
};

export default function SiteDetailsNodeIcon(props: Props) {
  const classes = useStyles(props);
  const selectedNode = props.selectedNode;
  const context = useContext<NetworkContextType>(NetworkContext);

  if (
    selectedNode &&
    context.networkConfig.status_dump &&
    context.networkConfig.status_dump.statusReports[selectedNode.mac_addr] &&
    context.networkConfig.status_dump.statusReports[selectedNode.mac_addr]
      .bgpStatus
  ) {
    return (
      <Grid
        cols={1}
        data-testid="bgpStatusIcon"
        className={classes.primaryPopIcon}
        title="BGP Speaker">
        <Grid item>
          <StarIcon className={classes.primaryPopStar} />
        </Grid>
        <Grid item>
          <RouterIcon />
        </Grid>
      </Grid>
    );
  }
  return <RouterIcon data-testid="routerIcon" />;
}
