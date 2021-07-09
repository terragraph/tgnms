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
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {cloneDeep} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {sendTopologyBuilderRequest} from '@fbcnms/tg-nms/app/helpers/MapPanelHelpers';
import {useAzimuthManager} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {usePlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

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
  } = useTopologyBuilderContext();
  const {networkName} = useNetworkContext();
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

  const onSubmit = React.useCallback(async () => {
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
        const data = {
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
          await azimuthManager.moveSite(initialParams.site);
        } catch (error) {
          handleAddTopologyClose(error.message);
        }
      } else if (elementType === TOPOLOGY_ELEMENT.NODE) {
        const data = {
          nodeName: initialParams.nodes[0].name,
          newNode: newTopology.nodes[0],
        };
        try {
          await sendTopologyBuilderRequest(
            networkName,
            'editNode',
            data,
            handleAddTopologyClose,
          );
        } catch (error) {
          handleAddTopologyClose(error.message);
        }
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
          <Grid container spacing={2} style={{width: '100%'}}>
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
                  <AssetDropDown
                    expanded={nodeOpen}
                    onPanelChange={() => setNodeOpen(!nodeOpen)}
                    title="Nodes">
                    <NodeDetails />
                  </AssetDropDown>
                  <Divider className={classes.resultDivider} />
                </>
              )}
              {showLinks && (
                <AssetDropDown
                  expanded={linkOpen}
                  onPanelChange={() => setLinkOpen(!linkOpen)}
                  title="Links">
                  <LinkDetails />
                </AssetDropDown>
              )}
            </Grid>
            <Grid item container spacing={1} xs={12}>
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
                  data-testid="add-link-button"
                  onClick={onSubmit}>
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