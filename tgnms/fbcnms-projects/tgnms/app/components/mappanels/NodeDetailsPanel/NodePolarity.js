/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import Typography from '@material-ui/core/Typography';
import {PolarityTypeValueMap} from '../../../../shared/types/Topology';
import {SiteOverlayColors} from '../../../constants/LayerConstants';
import {getNodePolarities} from '../../../helpers/TgFeatures';
import {makeStyles} from '@material-ui/styles';

import type {NetworkConfig} from '../../../NetworkContext';
import type {NodeType} from '../../../../shared/types/Topology';

const useStyles = makeStyles(theme => ({
  indented: {
    marginLeft: theme.spacing(1),
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
}));

type Props = {
  ctrlVersion: string,
  node: NodeType,
  networkConfig: NetworkConfig,
};

const POLARITY_UI = {
  [PolarityTypeValueMap.ODD]: {
    color: SiteOverlayColors.polarity.odd.color,
    text: 'Odd',
  },
  [PolarityTypeValueMap.EVEN]: {
    color: SiteOverlayColors.polarity.even.color,
    text: 'Even',
  },
  [PolarityTypeValueMap.HYBRID_ODD]: {
    color: SiteOverlayColors.polarity.hybrid_odd.color,
    text: 'Hybrid Odd',
  },
  [PolarityTypeValueMap.HYBRID_EVEN]: {
    color: SiteOverlayColors.polarity.hybrid_even.color,
    text: 'Hybrid Even',
  },
  unknown: {
    color: SiteOverlayColors.polarity.unknown.color,
    text: 'Unknown',
  },
};

export default function NodePolarity(props: Props) {
  const classes = useStyles();
  const {ctrlVersion, node, networkConfig} = props;
  const mac2Polarity = getNodePolarities(
    ctrlVersion,
    node,
    networkConfig.topologyConfig,
  );
  const macAddresses = Object.keys(mac2Polarity);
  if (macAddresses.length < 1) {
    return null;
  }
  return (
    <div>
      <Typography variant="subtitle2">Polarity</Typography>
      <div className={classes.indented}>
        {macAddresses.map(macAddr => {
          const polarity = mac2Polarity[macAddr];
          const {color, text} = POLARITY_UI[polarity]
            ? POLARITY_UI[polarity]
            : POLARITY_UI.unknown;
          return (
            <div className={classes.spaceBetween} key={macAddr}>
              <Typography variant="body2">{macAddr}</Typography>
              <Typography variant="body2">
                <span style={{color: color}}>{text}</span>
              </Typography>
            </div>
          );
        })}
      </div>
    </div>
  );
}
