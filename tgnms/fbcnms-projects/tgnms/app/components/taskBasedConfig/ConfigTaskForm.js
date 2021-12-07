/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '@fbcnms/tg-nms/app/components/common/LoadingBox';
import Typography from '@material-ui/core/Typography';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {Provider as TaskConfigContextProvider} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';
import {cloneDeep} from 'lodash';
import {
  getConfigLayer,
  getDraftConfig,
  isConfigChanged,
} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useNodeConfig} from '@fbcnms/tg-nms/app/hooks/useNodeConfig';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useUpdateConfig} from '@fbcnms/tg-nms/app/hooks/useUpdateConfig';

import type {NodeConfigStatusType} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';

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
  onSubmit?: () => void,
  advancedLink?: React.Node,
  customText?: string,
  nodeInfo?: ?NodeConfigStatusType,
  showSubmitButton?: boolean,
  onUpdate?: ({[string]: string}) => {},
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
    onSubmit,
    advancedLink,
    customText,
    showSubmitButton,
    onUpdate,
  } = props;
  const classes = useStyles();
  const snackbars = useSnackbars();
  const updateConfig = useUpdateConfig();
  const jsonConfigRef = React.useRef(null);
  const nodeName = props.nodeName ? props.nodeName : nodeInfo?.name;
  const [draftConfig, setDraftConfig] = React.useState({});

  const onUpdateRef = useLiveRef(onUpdate);

  React.useEffect(() => {
    if (onUpdateRef.current && draftConfig) {
      onUpdateRef.current(draftConfig);
    }
  }, [draftConfig, onUpdateRef]);

  const {loading, reloadConfig, configData, configParams} = useNodeConfig({
    nodeName: editMode === FORM_CONFIG_MODES.NODE ? nodeName : null,
    imageVersion,
    firmwareVersion,
    hardwareType,
    editMode,
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
    cloneDeep(networkOverridesConfig || {}),
  );

  React.useEffect(() => {
    setDraftConfig({});
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
    const jsonConfig = jsonConfigRef.current;
    const drafts = draftConfig;

    if (editMode === FORM_CONFIG_MODES.NODE && nodeName == null) {
      snackbars.error('Config change failed, please double check the form');
      return;
    }

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

    jsonConfigRef.current = null;
    reloadConfig();
  }, [
    onClose,
    networkOverridesConfig,
    nodeOverridesConfig,
    controllerConfig,
    aggregatorConfig,
    draftConfig,
    nodeName,
    editMode,
    snackbars,
    reloadConfig,
    updateConfig,
  ]);

  const handleCancel = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
    reloadConfig();
    setDraftConfig({});
    jsonConfigRef.current = null;
  }, [onClose, reloadConfig]);

  const handleDeleteConfigField = React.useCallback(
    (paths: Array<string>) => {
      let currentConfig;
      switch (editMode) {
        case FORM_CONFIG_MODES.NETWORK:
          currentConfig = networkOverridesConfig;
          break;
        case FORM_CONFIG_MODES.AGGREGATOR:
          currentConfig = aggregatorConfig;
          break;
        case FORM_CONFIG_MODES.CONTROLLER:
          currentConfig = controllerConfig;
          break;
        case FORM_CONFIG_MODES.NODE:
        case FORM_CONFIG_MODES.MULTINODE:
          // Node
          currentConfig = nodeOverridesConfig;
          break;
        default:
          throw new Error('Edit mode not supported.');
      }
      updateConfig.delete({
        type: editMode,
        paths,
        currentConfig,
      });
    },
    [
      updateConfig,
      editMode,
      networkOverridesConfig,
      nodeOverridesConfig,
      controllerConfig,
      aggregatorConfig,
    ],
  );

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
        setDraftConfig(curr => {
          const copy = {...curr};
          delete copy[configField];
          return copy;
        });
        return;
      }
      if (draftValue != undefined) {
        setDraftConfig(curr => ({
          ...curr,
          [configField]: draftValue,
        }));
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
      drafts: draftConfig,
    });

  const isDisabled = !isConfigChanged(draftChanges, currentConfig);

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
          nodeOverridesConfig={nodeOverridesConfig ?? {}}
          configParams={configParams}
          onUpdate={handleInputUpdate}
          onDelete={handleDeleteConfigField}
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
                onClick={onSubmit ? onSubmit : handleSubmitConfig}
                disabled={isDisabled}>
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
