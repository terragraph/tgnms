/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '../../components/common/LoadingBox';
import Typography from '@material-ui/core/Typography';
import {FORM_CONFIG_MODES} from '../../constants/ConfigConstants';
import {Provider as TaskConfigContextProvider} from '../../contexts/ConfigTaskContext';
import {cloneDeep} from 'lodash';
import {
  getConfigLayer,
  getDraftConfig,
  isConfigChanged,
} from '../../helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useNodeConfig} from '../../hooks/useNodeConfig';
import {useSnackbars} from '../../hooks/useSnackbar';
import {useUpdateConfig} from '../../hooks/useUpdateConfig';

import type {NodeConfigStatusType} from '../../helpers/ConfigHelpers';

export type Props = {
  children: React.Node,
  editMode: $Values<typeof FORM_CONFIG_MODES>,
  title?: React.Node,
  description?: React.Node,
  nodeName?: ?string,
  imageVersion?: ?string,
  firmwareVersion?: ?string,
  hardwareType?: ?string,
  onClose?: () => void,
  advancedLink?: React.Node,
  customText?: string,
  nodeInfo?: ?NodeConfigStatusType,
  showSubmitButton?: boolean,
};

const useStyles = makeStyles(_theme => ({
  root: {
    flexGrow: 1,
  },
}));

export default function ConfigTaskForm(props: Props) {
  const {
    children,
    title,
    description,
    editMode,
    nodeInfo,
    imageVersion,
    firmwareVersion,
    hardwareType,
    onClose,
    advancedLink,
    customText,
    showSubmitButton,
  } = props;
  const classes = useStyles();
  const snackbars = useSnackbars();
  const updateConfig = useUpdateConfig();
  const draftsRef = React.useRef({});
  const jsonConfigRef = React.useRef(null);
  const nodeName = props.nodeName ? props.nodeName : nodeInfo?.name;

  const [refreshConfig, setRefreshConfig] = React.useState(1);

  const {loading, configData, configParams} = useNodeConfig({
    nodeName: editMode === FORM_CONFIG_MODES.NODE ? nodeName : null,
    imageVersion,
    firmwareVersion,
    hardwareType,
    editMode,
    refreshConfig,
  });

  const {
    networkOverridesConfig,
    nodeOverridesConfig,
    controllerConfig,
    aggregatorConfig,
    metadata,
  } = configParams;

  const configDataRef = React.useRef(configData);
  const [currentConfig, setCurrentConfig] = React.useState(
    cloneDeep(networkOverridesConfig),
  );

  React.useEffect(() => {
    switch (editMode) {
      case FORM_CONFIG_MODES.NETWORK:
        setCurrentConfig(cloneDeep(networkOverridesConfig));
        break;
      case FORM_CONFIG_MODES.NODE:
        if (nodeOverridesConfig && nodeName) {
          setCurrentConfig(cloneDeep(nodeOverridesConfig[nodeName]) ?? {});
        }
        break;
      case FORM_CONFIG_MODES.MULTINODE:
        if (nodeOverridesConfig && nodeName) {
          setCurrentConfig(cloneDeep(nodeOverridesConfig[nodeName]) ?? {});
        }
        break;
      case FORM_CONFIG_MODES.CONTROLLER:
        setCurrentConfig(cloneDeep(controllerConfig));
        break;
      case FORM_CONFIG_MODES.AGGREGATOR:
        setCurrentConfig(cloneDeep(aggregatorConfig));
        break;
    }
  }, [
    editMode,
    aggregatorConfig,
    controllerConfig,
    networkOverridesConfig,
    nodeOverridesConfig,
    nodeName,
  ]);

  const handleSubmitConfig = React.useCallback(() => {
    if (editMode === FORM_CONFIG_MODES.NODE && nodeName == null) {
      snackbars.error('Config change failed, please double check the form');
      return;
    }
    const jsonConfig = jsonConfigRef.current;
    const drafts = draftsRef.current;

    if (editMode === FORM_CONFIG_MODES.NETWORK) {
      updateConfig.network({
        drafts: drafts,
        currentConfig: networkOverridesConfig,
        jsonConfig: jsonConfig,
      });
    } else if (editMode === FORM_CONFIG_MODES.AGGREGATOR) {
      updateConfig.aggregator({
        drafts: drafts,
        currentConfig: aggregatorConfig,
        jsonConfig: jsonConfig,
      });
    } else if (editMode === FORM_CONFIG_MODES.CONTROLLER) {
      updateConfig.controller({
        drafts: drafts,
        currentConfig: controllerConfig,
        jsonConfig: jsonConfig,
      });
    } else if (editMode === FORM_CONFIG_MODES.MULTINODE) {
      updateConfig.node({
        drafts: drafts,
        currentConfig: nodeOverridesConfig,
        jsonConfig: jsonConfig,
      });
    } else if (nodeName) {
      updateConfig.node({
        drafts: {[nodeName]: drafts},
        currentConfig: nodeOverridesConfig,
        jsonConfig: jsonConfig,
      });
    }
    if (onClose) {
      onClose();
    }

    draftsRef.current = {};
    jsonConfigRef.current = null;
    setRefreshConfig(refreshConfig + 1);
  }, [
    onClose,
    networkOverridesConfig,
    nodeOverridesConfig,
    controllerConfig,
    aggregatorConfig,
    draftsRef,
    nodeName,
    editMode,
    snackbars,
    refreshConfig,
    updateConfig,
  ]);

  const handleCancel = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
    setRefreshConfig(refreshConfig + 1);
    draftsRef.current = {};
    jsonConfigRef.current = null;
  }, [onClose, refreshConfig]);

  React.useEffect(() => {
    configDataRef.current = configData;
  }, [editMode, configData, imageVersion, firmwareVersion, hardwareType]);

  const handleSetJson = React.useCallback(
    newJson => {
      jsonConfigRef.current = newJson;
    },
    [jsonConfigRef],
  );

  const handleInputUpdate = React.useCallback(
    ({configField, draftValue}) => {
      const tempConfig = configDataRef.current?.find(
        config => config.field.join('.') === configField,
      );

      const currentEditMode = getConfigLayer({editMode});

      const currentLayerValue = tempConfig?.layers.find(
        layer => layer.id === currentEditMode,
      )?.value;

      if (currentLayerValue === draftValue) {
        delete draftsRef.current[configField];
        return;
      }
      if (draftValue != undefined) {
        draftsRef.current = {...draftsRef.current, [configField]: draftValue};
      }
    },
    [editMode],
  );

  if (loading || !configData) {
    return <LoadingBox />;
  }
  const draftChanges =
    jsonConfigRef.current ??
    getDraftConfig<{}>({
      currentConfig,
      drafts: draftsRef.current,
    });

  return (
    <Grid
      item
      container
      className={classes.root}
      direction={'column'}
      spacing={4}>
      {(title || description) && (
        <Grid item>
          {title && <Typography variant="h6">{title}</Typography>}
          {description && (
            <Typography variant="body2" color="textSecondary">
              {description}
            </Typography>
          )}
        </Grid>
      )}
      <Grid item xs={12}>
        <TaskConfigContextProvider
          configData={configDataRef.current ?? []}
          configMetadata={metadata || {}}
          configOverrides={currentConfig}
          networkConfigOverride={networkOverridesConfig ?? {}}
          configParams={configParams}
          onUpdate={handleInputUpdate}
          onSetJson={handleSetJson}
          draftChanges={draftChanges}
          editMode={editMode}
          onCancel={handleCancel}
          onSubmit={handleSubmitConfig}
          selectedValues={{
            nodeInfo,
            imageVersion,
            firmwareVersion,
            hardwareType,
            refreshConfig,
          }}>
          {children}
        </TaskConfigContextProvider>
      </Grid>
      {showSubmitButton && (
        <Grid item>
          <Grid container spacing={2} style={{justifyContent: 'flex-end'}}>
            <Grid item>
              <Button
                onClick={handleCancel}
                data-testid="cancel-button"
                variant="text">
                Cancel
              </Button>
            </Grid>
            <Grid item>
              <Button
                type="submit"
                data-testid="submit-button"
                variant="contained"
                color="primary"
                onClick={handleSubmitConfig}
                disabled={!isConfigChanged(draftChanges, currentConfig)}>
                {customText ?? 'Submit'}
              </Button>
            </Grid>
          </Grid>
          {advancedLink ? advancedLink : null}
        </Grid>
      )}
    </Grid>
  );
}
