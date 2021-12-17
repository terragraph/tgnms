/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ConfigAppBar from './ConfigAppBar';
import ConfigContent from './ConfigContent';
import ConfigSidebar from './ConfigSidebar';
import ConfigTaskForm from '@fbcnms/tg-nms/app/components/taskBasedConfig/ConfigTaskForm';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import {
  EDITOR_OPTIONS,
  NETWORK_CONFIG_MODE,
  SELECTED_NODE_QUERY_PARAM,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {configRootHeightCss} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {getTopologyNodeList} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'column',
    overflowY: 'hidden',
    height: '100%',
  },
  appBar: {
    position: 'inherit',
  },
  buttonContainer: {
    position: 'absolute',
    right: theme.spacing(),
    marginTop: theme.spacing(),
  },
  tabContent: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'row',
    height: configRootHeightCss(theme),
  },
  configOptions: {
    display: 'flex',
    flexFlow: 'column',
    width: 256,
    minWidth: 256,
  },
  configBody: {
    display: 'flex',
    flexFlow: 'column',
    flexGrow: 1,
    overflow: 'hidden',
    marginLeft: theme.spacing(0.5),
  },
  jsonTextarea: {
    fontFamily: 'monospace',
    height: '100%',
    border: 'none',
    margin: theme.spacing(2),
  },
}));

export default function NetworkConfig() {
  const classes = useStyles();
  const {networkConfig} = useNetworkContext();

  const getNodeFromQueryString = React.useCallback(() => {
    const values = new URL(window.location).searchParams;
    const name = values.get(SELECTED_NODE_QUERY_PARAM);
    if (name == null) {
      return null;
    }
    const nodes = getTopologyNodeList(networkConfig, null);
    return nodes.find(node => node.name === name) || null;
  }, [networkConfig]);

  const [firmwareVersion, setFirmwareVersion] = React.useState(null);
  const [imageVersion, setImageVersion] = React.useState(null);
  const [hardwareType, setHardwareType] = React.useState(null);
  const [selectedNode, setSelectedNode] = React.useState(
    getNodeFromQueryString(),
  );
  const [hideDeprecatedFields, setHideDeprecatedFields] = React.useState(true);
  const [contentDisplayMode, setContentDisplayMode] = React.useState(
    isFeatureEnabled('FORM_CONFIG_ENABLED')
      ? EDITOR_OPTIONS.FORM
      : isFeatureEnabled('TABLE_CONFIG_ENABLED')
      ? EDITOR_OPTIONS.TABLE
      : EDITOR_OPTIONS.JSON,
  );

  const [editMode, setEditMode] = React.useState(
    selectedNode ? NETWORK_CONFIG_MODE.NODE : NETWORK_CONFIG_MODE.NETWORK,
  );

  return (
    <ConfigTaskForm
      editMode={editMode}
      nodeInfo={selectedNode ?? null}
      imageVersion={imageVersion}
      firmwareVersion={firmwareVersion}
      hardwareType={hardwareType}>
      <div className={classes.root}>
        <ConfigAppBar
          onChangeEditMode={setEditMode}
          rawJsonEditor={contentDisplayMode === EDITOR_OPTIONS.JSON}
        />
        <div className={classes.tabContent}>
          <Paper className={classes.configOptions} square elevation={2}>
            <ConfigSidebar
              useRawJsonEditor={contentDisplayMode === EDITOR_OPTIONS.JSON}
              hideDeprecatedFields={hideDeprecatedFields}
              onChangeContentDisplayType={setContentDisplayMode}
              onSelectNode={setSelectedNode}
              onSelectImage={setImageVersion}
              onSelectHardwareType={setHardwareType}
              onSelectFirmwareVersion={setFirmwareVersion}
              onSetHideDeprecated={setHideDeprecatedFields}
            />
          </Paper>
          <Paper className={classes.configBody} square elevation={0}>
            <ConfigContent
              contentDisplayMode={contentDisplayMode}
              hideDeprecatedFields={hideDeprecatedFields}
            />
          </Paper>
        </div>
      </div>
    </ConfigTaskForm>
  );
}
