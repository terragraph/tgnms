/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AddIcon from '@material-ui/icons/Add';
import AddL2Tunnel from '../../components/mappanels/AddL2Tunnel';
import AddLinkPanel from '../../components/mappanels/AddLinkPanel';
import AddLocationIcon from '@material-ui/icons/AddLocation';
import AddNodePanel from '../../components/mappanels/AddNodePanel';
import AddSitePanel from '../../components/mappanels/AddSitePanel';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import Fab from '@material-ui/core/Fab';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '../../contexts/NetworkContext';
import PublishIcon from '@material-ui/icons/Publish';
import RouterIcon from '@material-ui/icons/Router';
import Slide from '@material-ui/core/Slide';
import TuneIcon from '@material-ui/icons/Tune';
import mapboxgl from 'mapbox-gl';
import useLiveRef from '../../hooks/useLiveRef';
import {FormType, SlideProps} from '../../constants/MapPanelConstants';
import {PANELS, PANEL_STATE} from '../../components/mappanels/usePanelControl';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {UploadTopologyPanel} from '../../components/mappanels/UploadTopologyPanel';
import {isFeatureEnabled} from '../../constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useCallback, useContext, useState} from 'react';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';

import type {
  EditLinkParams,
  EditNodeParams,
  PlannedSiteProps,
} from '../../components/mappanels/MapPanelTypes';
import type {LocationType, SiteType} from '../../../shared/types/Topology';
import type {PanelStateControl} from '../../components/mappanels/usePanelControl';

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
  plannedSiteProps: PlannedSiteProps,
  mapRef: ?mapboxgl.Map,
  panelControl: PanelStateControl,
  panelForm: TopologyBuilderState<EditTopologyElementParams>,
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
  const {panelControl, panelForm, plannedSiteProps, mapRef} = props;
  const {params, formType, updateForm} = panelForm;
  const classes = useStyles();
  const enqueueSnackbar = useEnqueueSnackbar();
  const plannedSitePropsRef = useLiveRef(plannedSiteProps);
  const panelControlRef = useLiveRef(panelControl);
  const context = useContext(NetworkContext);
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
    const {unhideSite, onUpdatePlannedSite} = plannedSitePropsRef.current;
    // Stop editing the previous site
    if (siteName) {
      unhideSite(siteName);
      setSiteName(null);
    }
    onUpdatePlannedSite(null);
  }, [plannedSitePropsRef, siteName]);

  const handleTopologyChangeSnackbar = useCallback(
    (changeMessage: ?string) => {
      if (changeMessage === 'success') {
        enqueueSnackbar(
          'Topology successfully changed! Please wait a few moments for the topology to update.',
          {variant: 'success'},
        );
      } else {
        enqueueSnackbar(
          `Topology change failed${changeMessage ? ':' + changeMessage : ''} `,
          {
            variant: 'error',
          },
        );
      }
    },
    [enqueueSnackbar],
  );

  const handleActionsMenuOpen = useCallback(
    ev => {
      menuAnchorEl.current = ev.currentTarget;
      setShowMenu(true);
    },
    [menuAnchorEl, setShowMenu],
  );

  const handleNodePanelClose = useCallback(
    (changeMessage?: string) => {
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
      const {
        plannedSite,
        onUpdatePlannedSite,
        unhideSite,
      } = plannedSitePropsRef.current;

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
      onUpdatePlannedSite(initialPosition);
    },
    [mapRef, plannedSitePropsRef, formType, siteName, networkConfig.bounds],
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
      {
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
      }
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
          plannedSite={plannedSiteProps.plannedSite}
          onUpdatePlannedSite={plannedSiteProps.onUpdatePlannedSite}
          topology={topology}
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
          <ListItemText primary="Add Node" />
        </MenuItem>
        <MenuItem onClick={handleAddLinkClick} data-testid="add-link">
          <ListItemIcon>{<CompareArrowsIcon />}</ListItemIcon>
          <ListItemText primary="Add Link" />
        </MenuItem>
        {isFeatureEnabled('L2_TUNNELS_ENABLED') && (
          <MenuItem onClick={handleL2TunnelClick} data-testid="add-l2">
            <ListItemIcon>{<TuneIcon />}</ListItemIcon>
            <ListItemText primary="Add L2 Tunnel" />
          </MenuItem>
        )}
        <MenuItem onClick={handleAddSiteClick} data-testid="add-planned-site">
          <ListItemIcon>{<AddLocationIcon />}</ListItemIcon>
          <ListItemText primary="Add Planned Site" />
        </MenuItem>
        <MenuItem onClick={handleUploadTopologyClick}>
          <ListItemIcon>{<PublishIcon />}</ListItemIcon>
          <ListItemText primary="Upload Topology File" />
        </MenuItem>
      </Menu>
    </>
  );
}
