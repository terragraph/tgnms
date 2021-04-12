/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AssistantIcon from '@material-ui/icons/Assistant';
import EditIcon from '@material-ui/icons/Edit';
import RouterIcon from '@material-ui/icons/Router';
import ScatterPlotIcon from '@material-ui/icons/ScatterPlot';
import Tooltip from '@material-ui/core/Tooltip';
import {CONFIG_LAYER} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {makeStyles} from '@material-ui/styles';

import type {ConfigDataLayerType} from '@fbcnms/tg-nms/app/constants/ConfigConstants';

const useStyles = makeStyles(() => ({
  statusIcon: {
    fontSize: 16,
    padding: '0 1px',
    verticalAlign: 'text-bottom',
  },
}));

export default function ConfigTableEntryIcon({
  renderedLayers,
  hasDraftOverride,
}: {
  renderedLayers: ConfigDataLayerType,
  hasDraftOverride: boolean,
}) {
  const classes = useStyles();

  const icons: Array<React.Node | null> = renderedLayers.map(({id}) => {
    const iconProps = {
      classes: {root: classes.statusIcon},
      'data-testid': 'table-entry-icon',
    };
    const icon =
      id === CONFIG_LAYER.AUTO_NODE ? (
        <AssistantIcon {...iconProps} />
      ) : id === CONFIG_LAYER.NETWORK ? (
        <ScatterPlotIcon {...iconProps} />
      ) : id === CONFIG_LAYER.NODE ? (
        <RouterIcon {...iconProps} />
      ) : hasDraftOverride && id !== CONFIG_LAYER.BASE ? (
        <EditIcon {...iconProps} />
      ) : null;
    return icon ? (
      <Tooltip key={id} title={id}>
        {icon}
      </Tooltip>
    ) : null;
  });

  return icons;
}
