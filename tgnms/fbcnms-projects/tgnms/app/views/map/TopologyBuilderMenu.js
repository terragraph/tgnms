/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AddIcon from '@material-ui/icons/Add';
import AddL2Tunnel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/AddL2Tunnel';
import AddLinkPanel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/AddLinkPanel';
import AddLocationIcon from '@material-ui/icons/AddLocation';
import AddNodePanel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/AddNodePanel';
import AddSitePanel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/AddSitePanel';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import Fab from '@material-ui/core/Fab';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import PublishIcon from '@material-ui/icons/Publish';
import RouterIcon from '@material-ui/icons/Router';
import Slide from '@material-ui/core/Slide';
import TerrainIcon from '@material-ui/icons/Terrain';
import TuneIcon from '@material-ui/icons/Tune';
import mapboxgl from 'mapbox-gl';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {
  FormType,
  SlideProps,
} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {UploadTopologyPanel} from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/UploadTopologyPanel';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useCallback, useContext, useState} from 'react';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {usePlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {
  EditLinkParams,
  EditNodeParams,
} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {
  LocationType,
  SiteType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import type {SiteProps} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';

const useStyles = makeStyles(theme => ({
  addButton: {
    position: 'fixed',
    right: 0,
    bottom: 0,
    margin: theme.spacing(2),
  },
}));

export type EditTopologyElementParams =
  | $Shape<EditNodeParams>
  | EditLinkParams
  | $Shape<SiteType>;
type Props = {|
  mapRef: ?mapboxgl.Map,
  panelControl: PanelStateControl,
  panelForm: TopologyBuilderState<EditTopologyElementParams>,
  siteProps: SiteProps,
|};

export type PanelForm<T> = {|
  params: ?T,
  formType: $Values<typeof FormType>,
|};
export type TopologyBuilderState<T> = {
  ...PanelForm<T>,
  updateForm: (x: $Shape<PanelForm<T>>) => void,
};

export function useTopologyBuilderForm<T>(): TopologyBuilderState<T> {
  const [{params, formType}, setFormState] = React.useState<
    $Shape<PanelForm<T>>,
  >({
    params: null,
    formType: FormType.CREATE,
  });
  const updateform = React.useCallback(
    (update: $Shape<PanelForm<T>>) => {
      setFormState(curr => ({
        ...curr,
        ...update,
      }));
    },
    [setFormState],
  );

  return {
    params: params,
    formType: formType,
    updateForm: updateform,
  };
}

export default function TopologyBuilderMenu(props: Props) {
  // Render the FAB with topology builder actions (add node/link/site)
  const {panelControl, panelForm, mapRef} = props;
  const {params, formType, updateForm} = panelForm;
  const classes = useStyles();
  const panelControlRef = useLiveRef(panelControl);
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const context = useContext(NetworkContext);
  const snackbars = useSnackbars();
  const {
    plannedSite,
    setLocation,
    update: updatePlannedSite,
  } = usePlannedSiteContext();
  const {unhideSite} = props.siteProps;
  const {networkConfig, networkName, selectedElement, setSelected} = context;
  const {controller_version, topology} = networkConfig;
  const menuAnchorEl = React.useRef<?HTMLElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [siteName, setSiteName] = useState(null);

  const hidePanel = React.useCallback(
    (panelKey: string) => {
      panelControlRef.current.setPanelState(panelKey, PANEL_STATE.HIDDEN);
    },
    [panelControlRef],
  );

  const onRemovePlannedSite = useCallback(() => {
    // Stop editing the previous site
    if (siteName) {
      unhideSite(siteName);
      setSiteName(null);
    }
    updatePlannedSite(null);
  }, [updatePlannedSite, siteName, unhideSite]);

  const handleTopologyChangeSnackbar = useCallback(
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

  const handleActionsMenuOpen = useCallback(
    ev => {
      menuAnchorEl.current = ev.currentTarget;
      setShowMenu(true);
    },
    [menuAnchorEl, setShowMenu],
  );

  const handleNodePanelClose = useCallback(
    (changeMessage?: ?string) => {
      // If editing a node and nothing else is selected,
      // re-select the node onClose
      if (
        formType === FormType.EDIT &&
        !selectedElement &&
        params &&
        typeof params.name === 'string' //coerce to EditNodeParams
      ) {
        setSelected(TopologyElementType.NODE, params.name);
      }
      hidePanel(PANELS.TOPOLOGY_NODE);
      if (changeMessage) {
        handleTopologyChangeSnackbar(changeMessage);
      }
    },
    [
      setSelected,
      formType,
      params,
      selectedElement,
      handleTopologyChangeSnackbar,
      hidePanel,
    ],
  );

  const handleSitePanelClose = useCallback(
    (changeMessage?: ?string) => {
      hidePanel(PANELS.TOPOLOGY_SITE);
      // Hide the planned state feature on the map
      onRemovePlannedSite();
      // If editing a site and nothing else is selected,
      // re-select the site onClose
      if (
        formType === FormType.EDIT &&
        !selectedElement &&
        params &&
        typeof params.name === 'string' //coerce to EditSiteParams
      ) {
        setSelected(TopologyElementType.SITE, params?.name ?? '');
      }

      if (changeMessage) {
        handleTopologyChangeSnackbar(changeMessage);
      }
    },
    [
      setSelected,
      onRemovePlannedSite,
      selectedElement,
      formType,
      params,
      handleTopologyChangeSnackbar,
      hidePanel,
    ],
  );

  const onAddPlannedSite = React.useCallback(
    (location?: LocationType) => {
      // Add a planned site to the map

      // If there's already a planned site...
      if (plannedSite && formType === FormType.EDIT && siteName) {
        // Stop editing the previous site
        unhideSite(siteName);
        setSiteName(null);
      }

      // Set initial position to the center of the map, or the provided location
      let initialPosition = {latitude: 0, longitude: 0};
      if (location) {
        const {latitude, longitude} = location;
        initialPosition = {latitude, longitude};
      } else if (mapRef) {
        const {lat, lng} = mapRef.getCenter();
        initialPosition = {latitude: lat, longitude: lng};
      } else if (networkConfig.bounds) {
        // Use networkConfig if map reference isn't set (shouldn't happen...)
        const [[minLng, minLat], [maxLng, maxLat]] = networkConfig.bounds;
        const latitude = minLat + (maxLat - minLat) / 2;
        const longitude = minLng + (maxLng - minLng) / 2;
        initialPosition = {latitude, longitude};
      }
      setLocation(initialPosition);
    },
    [
      mapRef,
      formType,
      siteName,
      networkConfig.bounds,
      setLocation,
      plannedSite,
      unhideSite,
    ],
  );

  const handleUploadTopologyPanelClose = React.useCallback(
    status => {
      hidePanel(PANELS.TOPOLOGY_UPLOAD);
      if (status) {
        handleTopologyChangeSnackbar(status);
      }
    },
    [handleTopologyChangeSnackbar, hidePanel],
  );

  const handleAddNodeClick = useCallback(() => {
    panelControlRef.current.collapseAll();
    panelControlRef.current.setPanelState(
      PANELS.TOPOLOGY_NODE,
      PANEL_STATE.OPEN,
    );
    updateForm({
      formType: FormType.CREATE,
      params: {},
    });
    setShowMenu(false);
  }, [panelControlRef, updateForm, setShowMenu]);

  const handleAddSiteClick = useCallback(() => {
    onAddPlannedSite();
    panelControlRef.current.collapseAll();
    panelControlRef.current.setPanelState(
      PANELS.TOPOLOGY_SITE,
      PANEL_STATE.OPEN,
    );
    updateForm({
      formType: FormType.CREATE,
      params: {},
    });
    setShowMenu(false);
  }, [onAddPlannedSite, panelControlRef, updateForm, setShowMenu]);

  const handleAddLinkClick = useCallback(() => {
    panelControlRef.current.collapseAll();
    panelControlRef.current.setPanelState(
      PANELS.TOPOLOGY_LINK,
      PANEL_STATE.OPEN,
    );
    updateForm({
      formType: FormType.CREATE,
      params: {},
    });
    setShowMenu(false);
  }, [panelControlRef, updateForm]);

  const handleL2TunnelClick = useCallback(() => {
    panelControlRef.current.collapseAll();
    panelControlRef.current.setPanelState(PANELS.L2_TUNNEL, PANEL_STATE.OPEN);
    updateForm({
      formType: FormType.CREATE,
      params: {},
    });
    setShowMenu(false);
  }, [panelControlRef, updateForm]);

  const handleUploadTopologyClick = useCallback(() => {
    panelControlRef.current.collapseAll();
    panelControlRef.current.setPanelState(
      PANELS.TOPOLOGY_UPLOAD,
      PANEL_STATE.OPEN,
    );
    updateForm({
      formType: FormType.CREATE,
      params: {},
    });
    setShowMenu(false);
  }, [updateForm, panelControlRef, setShowMenu]);
  const handlePlanClicked = useCallback(() => {
    setSelectedPlanId('');
  }, [setSelectedPlanId]);
  const siteParams: ?$Shape<SiteType> = (params: any);

  return (
    <>
      <Slide
        {...SlideProps}
        unmountOnExit
        in={!panelControl.getIsHidden(PANELS.TOPOLOGY_NODE)}>
        <AddNodePanel
          expanded={panelControl.getIsOpen(PANELS.TOPOLOGY_NODE)}
          onPanelChange={() => panelControl.toggleOpen(PANELS.TOPOLOGY_NODE)}
          onClose={handleNodePanelClose}
          formType={formType}
          initialParams={params || {}}
          ctrlVersion={controller_version}
          networkConfig={networkConfig}
          networkName={networkName}
          topology={topology}
        />
      </Slide>
      <Slide
        {...SlideProps}
        unmountOnExit
        in={!panelControl.getIsHidden(PANELS.TOPOLOGY_LINK)}>
        <AddLinkPanel
          expanded={panelControl.getIsOpen(PANELS.TOPOLOGY_LINK)}
          onPanelChange={() => panelControl.toggleOpen(PANELS.TOPOLOGY_LINK)}
          onClose={status => {
            hidePanel(PANELS.TOPOLOGY_LINK);
            if (status) {
              handleTopologyChangeSnackbar(status);
            }
          }}
          initialParams={params ?? {}}
          topology={topology}
          networkName={networkName}
        />
      </Slide>
      <Slide
        {...SlideProps}
        unmountOnExit
        in={!panelControl.getIsHidden(PANELS.L2_TUNNEL)}>
        <AddL2Tunnel
          expanded={panelControl.getIsOpen(PANELS.L2_TUNNEL)}
          onPanelChange={() => panelControl.toggleOpen(PANELS.L2_TUNNEL)}
          onClose={() => {
            hidePanel(PANELS.L2_TUNNEL);
          }}
        />
      </Slide>
      <Slide
        {...SlideProps}
        unmountOnExit
        in={!panelControl.getIsHidden(PANELS.TOPOLOGY_SITE)}>
        <AddSitePanel
          expanded={panelControl.getIsOpen(PANELS.TOPOLOGY_SITE)}
          onPanelChange={() => panelControl.toggleOpen(PANELS.TOPOLOGY_SITE)}
          onClose={handleSitePanelClose}
          formType={formType}
          initialParams={{
            ...(siteParams?.location ?? {}),
            name: siteParams?.name ?? '',
          }}
          networkName={networkName}
          topology={topology}
          plannedSite={plannedSite}
          onUpdatePlannedSite={updatePlannedSite}
        />
      </Slide>
      <Slide
        {...SlideProps}
        unmountOnExit
        in={!panelControl.getIsHidden(PANELS.TOPOLOGY_UPLOAD)}>
        <UploadTopologyPanel
          expanded={panelControl.getIsOpen(PANELS.TOPOLOGY_UPLOAD)}
          onPanelChange={() => panelControl.toggleOpen(PANELS.TOPOLOGY_UPLOAD)}
          onClose={handleUploadTopologyPanelClose}
          networkName={networkName}
        />
      </Slide>
      <Fab
        data-testid="addTopologyIcon"
        className={classes.addButton}
        color="primary"
        aria-haspopup="true"
        onClick={handleActionsMenuOpen}>
        <AddIcon />
      </Fab>
      <Menu
        anchorEl={menuAnchorEl.current}
        id="topology-builder-menu"
        open={showMenu}
        onClose={() => setShowMenu(false)}>
        <MenuItem onClick={handleAddNodeClick} data-testid="add-node">
          <ListItemIcon>{<RouterIcon />}</ListItemIcon>
          <ListItemText primary="Add node" />
        </MenuItem>
        <MenuItem onClick={handleAddLinkClick} data-testid="add-link">
          <ListItemIcon>{<CompareArrowsIcon />}</ListItemIcon>
          <ListItemText primary="Add link" />
        </MenuItem>
        {isFeatureEnabled('L2_TUNNELS_ENABLED') && (
          <MenuItem onClick={handleL2TunnelClick} data-testid="add-l2">
            <ListItemIcon>{<TuneIcon />}</ListItemIcon>
            <ListItemText primary="Add L2 tunnel" />
          </MenuItem>
        )}
        <MenuItem onClick={handleAddSiteClick} data-testid="add-planned-site">
          <ListItemIcon>{<AddLocationIcon />}</ListItemIcon>
          <ListItemText primary="Add planned site" />
        </MenuItem>
        <MenuItem onClick={handleUploadTopologyClick}>
          <ListItemIcon>{<PublishIcon />}</ListItemIcon>
          <ListItemText primary="Upload topology file" />
        </MenuItem>
        {isFeatureEnabled('NETWORK_PLANNING_ENABLED') && (
          <MenuItem onClick={handlePlanClicked}>
            <ListItemIcon>{<TerrainIcon />}</ListItemIcon>
            <ListItemText primary="Plan New Area" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
