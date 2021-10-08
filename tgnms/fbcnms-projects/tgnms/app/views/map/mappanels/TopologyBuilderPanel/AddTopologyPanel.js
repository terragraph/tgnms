/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AssetDropDown from './AssetDropDown';
import Button from '@material-ui/core/Button';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LinkDetails from './LinkDetails';
import NodeDetails from './NodeDetails';
import React from 'react';
import SiteDetails from './SiteDetails';
import Slide from '@material-ui/core/Slide';
import {FORM_TYPE} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {cloneDeep, isEqual} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {sendTopologyBuilderRequest} from '@fbcnms/tg-nms/app/helpers/MapPanelHelpers';
import {useAzimuthManager} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useNodeConfig} from '@fbcnms/tg-nms/app/hooks/useNodeConfig';
import {usePlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';
import {useUpdateConfig} from '@fbcnms/tg-nms/app/hooks/useUpdateConfig';

import type {MoveSitePayload} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

//in edit node there is only one node. Other modes will have multiple nodes
const EDIT_NODE_POSITION = 0;
const NO_CHANGE_MESSAGE = 'No changes to make to node';

const useStyles = makeStyles(theme => ({
  expandIcon: {
    order: -1,
  },
  rotateIcon: {
    transform: 'rotate(90deg)',
  },
  transition: {
    transition: 'all 0.3s',
  },
  title: {
    paddingLeft: theme.spacing(1),
    paddingTop: theme.spacing(0.25),
  },
  titleWrapper: {
    marginLeft: -theme.spacing(0.25),
  },
  resultDivider: {
    margin: `${theme.spacing()}px ${theme.spacing(-1.5)}px`,
  },
  topologyButtons: {
    paddingTop: theme.spacing(2),
  },
}));

export default function AddTopologyPanel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const {getIsHidden, getIsOpen, toggleOpen, setPanelState} = panelControl;
  const {
    setSelectedTopologyPanel,
    elementType,
    newTopology,
    initialParams,
    formType,
    nodeConfigs,
  } = useTopologyBuilderContext();
  const {networkName} = useNetworkContext();
  const {nextStep} = useTutorialContext();
  const updateConfig = useUpdateConfig();
  const {configParams} = useNodeConfig({});

  const {update: onUpdatePlannedSite} = usePlannedSiteContext();
  const azimuthManager = useAzimuthManager();

  const [siteOpen, setSiteOpen] = React.useState(false);
  const [nodeOpen, setNodeOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);

  React.useEffect(() => {
    if (elementType === TOPOLOGY_ELEMENT.SITE) {
      setSiteOpen(true);
      setNodeOpen(false);
      setLinkOpen(false);
    }
    if (elementType === TOPOLOGY_ELEMENT.NODE) {
      setSiteOpen(true);
      setNodeOpen(true);
      setLinkOpen(false);
    }
    if (elementType === TOPOLOGY_ELEMENT.LINK) {
      setLinkOpen(true);
    }
  }, [elementType]);

  const closePanel = React.useCallback(() => {
    setPanelState(PANELS.MANUAL_TOPOLOGY, PANEL_STATE.HIDDEN);
    onUpdatePlannedSite(null);
    setSelectedTopologyPanel(null);
  }, [setPanelState, onUpdatePlannedSite, setSelectedTopologyPanel]);

  React.useEffect(() => {
    if (elementType !== TOPOLOGY_ELEMENT.SITE) {
      onUpdatePlannedSite(null);
    }
  }, [elementType, onUpdatePlannedSite]);

  const snackbars = useSnackbars();
  const classes = useStyles();

  const handleAddTopologyClose = React.useCallback(
    (changeMessage: ?string) => {
      if (changeMessage === 'success') {
        snackbars.success(
          'Topology successfully changed! Please wait a few moments for the topology to update.',
        );
      } else {
        snackbars.error(
          `Topology change failed${changeMessage ? ':' + changeMessage : ''} `,
        );
      }
    },
    [snackbars],
  );

  const handleEditNodeClose = React.useCallback(
    (changeMessage: ?string) => {
      if (
        changeMessage === 'success' ||
        changeMessage?.includes(NO_CHANGE_MESSAGE)
      ) {
        snackbars.success(
          'Topology successfully changed! Please wait a few moments for the topology to update.',
        );
      } else {
        snackbars.error(
          `Topology change failed${changeMessage ? ': ' + changeMessage : ''} `,
        );
      }
    },
    [snackbars],
  );

  const onSubmit = React.useCallback(async () => {
    nextStep();
    if (newTopology) {
      if (formType === FORM_TYPE.CREATE) {
        const links = cloneDeep(newTopology.links).filter(link => {
          if (initialParams.links) {
            return !initialParams.links.some(
              initialLink =>
                initialLink.a_node_mac === link.a_node_mac &&
                initialLink.z_node_mac === link.z_node_mac,
            );
          }
          return true;
        });

        links.forEach(link => {
          if (link.a_node_name > link.z_node_name) {
            const tempName = link.a_node_name;
            const tempMac = link.a_node_mac;
            link.a_node_name = link.z_node_name;
            link.a_node_mac = link.z_node_mac;
            link.z_node_name = tempName;
            link.z_node_mac = tempMac;
          }
        });

        const nodes = cloneDeep(newTopology.nodes).filter(node => {
          if (initialParams.nodes) {
            return !initialParams.nodes.some(
              initialNode => initialNode.name === node.name,
            );
          }
          return true;
        });

        const data = {
          sites: [],
          nodes,
          links,
        };
        if (elementType === TOPOLOGY_ELEMENT.SITE) {
          data.sites.push(newTopology.site);
        }
        try {
          await sendTopologyBuilderRequest(
            networkName,
            'bulkAdd',
            data,
            handleAddTopologyClose,
          );
          await links.forEach(link => azimuthManager.addLink(link));
        } catch (error) {
          handleAddTopologyClose(error.message);
        }
      } else if (elementType === TOPOLOGY_ELEMENT.SITE) {
        const data: MoveSitePayload = {
          siteName: initialParams.site.name,
          newSite: newTopology.site,
        };
        try {
          await sendTopologyBuilderRequest(
            networkName,
            'editSite',
            data,
            handleAddTopologyClose,
          );
          await azimuthManager.moveSite(data);
        } catch (error) {
          handleAddTopologyClose(error.message);
        }
      } else if (elementType === TOPOLOGY_ELEMENT.NODE) {
        const nodeName = initialParams.nodes[EDIT_NODE_POSITION].name;

        const data = {
          nodeName,
          newNode: newTopology.nodes[EDIT_NODE_POSITION],
        };

        const oldWlanMacs =
          initialParams.nodes[EDIT_NODE_POSITION].wlan_mac_addrs;
        const newWlanMacs =
          newTopology.nodes[EDIT_NODE_POSITION].wlan_mac_addrs;
        if (!isEqual(oldWlanMacs, newWlanMacs)) {
          const links = cloneDeep(initialParams.links).map(link => {
            const aMacIndex = oldWlanMacs.findIndex(
              wlanMac => wlanMac === link.a_node_mac,
            );
            if (aMacIndex !== -1) {
              link.a_node_mac = newWlanMacs[aMacIndex];
            }
            const zMacIndex = oldWlanMacs.findIndex(
              wlanMac => wlanMac === link.z_node_mac,
            );
            if (zMacIndex !== -1) {
              link.z_node_mac = newWlanMacs[zMacIndex];
            }
            return link;
          });

          try {
            await sendTopologyBuilderRequest(
              networkName,
              'deleteNodeWlanMacAddresses',
              {nodeName, wlanMacs: oldWlanMacs, force: true},
              () => {},
            );
            await sendTopologyBuilderRequest(
              networkName,
              'addNodeWlanMacAddresses',
              {nodeName, wlanMacs: newWlanMacs},
              () => {},
            );
            await sendTopologyBuilderRequest(
              networkName,
              'bulkAdd',
              {links},
              () => {},
            );
            await links.forEach(link => azimuthManager.addLink(link));
          } catch (error) {
            handleAddTopologyClose(error.message);
          }
        }
        try {
          await sendTopologyBuilderRequest(
            networkName,
            'editNode',
            data,
            handleEditNodeClose,
          );
        } catch (error) {
          handleAddTopologyClose(error.message);
        }
      }
      try {
        if (Object.keys(nodeConfigs).length > 0) {
          await updateConfig.node({
            drafts: nodeConfigs,
            currentConfig: configParams.nodeOverridesConfig,
          });
        }
      } catch (error) {
        handleAddTopologyClose(error.message);
      }
      closePanel();
    }
  }, [
    newTopology,
    networkName,
    initialParams,
    handleAddTopologyClose,
    formType,
    elementType,
    closePanel,
    azimuthManager,
    nextStep,
    configParams,
    nodeConfigs,
    updateConfig,
    handleEditNodeClose,
  ]);
  const showSites = React.useMemo(() => elementType !== TOPOLOGY_ELEMENT.LINK, [
    elementType,
  ]);
  const showNodes = React.useMemo(
    () =>
      elementType === TOPOLOGY_ELEMENT.NODE ||
      (formType === FORM_TYPE.CREATE && elementType === TOPOLOGY_ELEMENT.SITE),
    [elementType, formType],
  );
  const showLinks = React.useMemo(() => formType !== FORM_TYPE.EDIT, [
    formType,
  ]);

  return (
    <Slide
      {...SlideProps}
      unmountOnExit
      in={!getIsHidden(PANELS.MANUAL_TOPOLOGY)}>
      <CustomAccordion
        title="Add Topology"
        data-testid="add-topology-panel"
        expanded={getIsOpen(PANELS.MANUAL_TOPOLOGY)}
        onChange={() => toggleOpen(PANELS.MANUAL_TOPOLOGY)}
        details={
          <Grid container style={{width: '100%'}}>
            <Grid item xs={12}>
              {showSites && (
                <>
                  <AssetDropDown
                    expanded={siteOpen}
                    onPanelChange={() => setSiteOpen(!siteOpen)}
                    title="Site">
                    <SiteDetails />
                  </AssetDropDown>
                  <Divider className={classes.resultDivider} />
                </>
              )}
              {showNodes && (
                <>
                  <div className={STEP_TARGET.NODE_SECTION}>
                    <AssetDropDown
                      expanded={nodeOpen}
                      onPanelChange={() => setNodeOpen(!nodeOpen)}
                      title="Nodes">
                      <NodeDetails />
                    </AssetDropDown>
                  </div>
                  <Divider className={classes.resultDivider} />
                </>
              )}
              {showLinks && (
                <div className={STEP_TARGET.LINK_SECTION}>
                  <AssetDropDown
                    expanded={linkOpen}
                    onPanelChange={() => setLinkOpen(!linkOpen)}
                    title="Links">
                    <LinkDetails />
                  </AssetDropDown>
                </div>
              )}
            </Grid>
            <Grid item />
            <Grid
              item
              container
              spacing={1}
              xs={12}
              className={classes.topologyButtons}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={closePanel}>
                  Cancel
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="small"
                  data-testid="save-topology-button"
                  onClick={onSubmit}
                  className={STEP_TARGET.SAVE_TOPOLOGY}>
                  Save
                </Button>
              </Grid>
            </Grid>
          </Grid>
        }
      />
    </Slide>
  );
}
