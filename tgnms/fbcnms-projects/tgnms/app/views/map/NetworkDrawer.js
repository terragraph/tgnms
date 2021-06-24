/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AccessPointsPanel from '@fbcnms/tg-nms/app/views/map/mappanels/AccessPointsPanel';
import AnnotationsPanel from '@fbcnms/tg-nms/app/views/map/mappanels/AnnotationsPanel/AnnotationsPanel';
import DefaultRouteHistoryPanel from '@fbcnms/tg-nms/app/views/map/mappanels/DefaultRouteHistoryPanel';
import Dragger from '@fbcnms/tg-nms/app/components/common/Dragger';
import Drawer from '@material-ui/core/Drawer';
import DrawerToggleButton from '@fbcnms/tg-nms/app/components/common/DrawerToggleButton';
import IgnitionStatePanel from '@fbcnms/tg-nms/app/views/map/mappanels/IgnitionStatePanel';
import L2TunnelPanel from '@fbcnms/tg-nms/app/views/map/mappanels/L2TunnelPanel';
import MapLayersPanel from '@fbcnms/tg-nms/app/views/map/mappanels/MapLayersPanel';
import NetworkPlanningPanel from '@fbcnms/tg-nms/app/views/map/mappanels/NetworkPlanningPanel';
import NetworkTestPanel from '@fbcnms/tg-nms/app/views/map/mappanels/NetworkTestPanel/NetworkTestPanel';
import OverviewPanel from '@fbcnms/tg-nms/app/views/map/mappanels/OverviewPanel';
import RemoteOverlayMetadataPanel from '@fbcnms/tg-nms/app/views/map/mappanels/RemoteOverlayMetadataPanel';
import RenderTopologyElement from '@fbcnms/tg-nms/app/views/map/RenderTopologyElement';
import ScanServicePanel from '@fbcnms/tg-nms/app/views/map/mappanels/ScanServicePanel/ScanServicePanel';
import SearchNearby from '@fbcnms/tg-nms/app/views/map/SearchNearby';
import Slide from '@material-ui/core/Slide';
import TopologyBuilderPanel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/TopologyBuilderPanel';
import UpgradeProgressPanel from '@fbcnms/tg-nms/app/views/map/mappanels/UpgradeProgressPanel';
import UploadTopologyPanel from '@fbcnms/tg-nms/app/views/map/mappanels/UploadTopologyPanel';
import useTopologyBuilderForm from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/useTopologyBuilderForm';
import {
  FORM_TYPE,
  SlideProps,
} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {
  PANELS,
  PANEL_STATE,
  usePanelControl,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {UpgradeReqTypeValueMap as UpgradeReqType} from '@fbcnms/tg-nms/shared/types/Controller';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {usePlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';

import type {EditTopologyElementParams} from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/useTopologyBuilderForm';
import type {Element} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {Props as MapLayersProps} from '@fbcnms/tg-nms/app/views/map/mappanels/MapLayersPanel';
import type {NearbyNodes} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';

export const NetworkDrawerConstants = {
  DRAWER_MIN_WIDTH: 330,
  DRAWER_MAX_WIDTH: 800,
};

const useStyles = makeStyles(theme => ({
  appBarSpacer: theme.mixins.toolbar,
  content: {
    height: '100%',
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(8),
    overflowX: 'hidden',
  },
  draggerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  drawerPaper: {
    width: 'inherit',
    height: 'inherit',
  },
}));

export type SearchNearbyProps = {|
  nearbyNodes: NearbyNodes,
  onUpdateNearbyNodes: NearbyNodes => *,
|};

type Props = {|
  networkDrawerWidth: number,
  onNetworkDrawerResize: number => *,
  mapLayersProps: MapLayersProps,
  searchNearbyProps: SearchNearbyProps,
  siteProps: {
    hideSite: string => void,
    unhideSite: string => void,
  },
  networkTestId?: ?string,
  scanId?: ?string,
|};

export default function NetworkDrawer({
  networkDrawerWidth,
  mapLayersProps,
  searchNearbyProps,
  networkTestId,
  onNetworkDrawerResize,
  scanId,
  siteProps,
}: Props) {
  const classes = useStyles();
  const drawerDimensions = {
    width: networkDrawerWidth,
    height: '100%',
  };
  const context = useNetworkContext();
  const {mapMode} = useMapContext();
  const {
    networkName,
    networkLinkHealth,
    nodeMap,
    selectedElement,
    pinnedElements,
  } = context;
  const {
    topology,
    ignition_state,
    status_dump,
    upgrade_state,
    wireless_controller,
    wireless_controller_stats,
  } = context.networkConfig;
  const {setLocation} = usePlannedSiteContext();

  const topologyElements: Array<Element> = [];
  if (selectedElement) {
    topologyElements.push(selectedElement);
  }
  pinnedElements
    .filter(
      el =>
        !(
          selectedElement &&
          el.type === selectedElement.type &&
          el.name === selectedElement.name
        ),
    )
    .forEach(el => topologyElements.push(el));

  const handleHorizontalResize = React.useCallback(
    width => {
      onNetworkDrawerResize(width);
      // Force map to resize
      window.dispatchEvent(new Event('resize'));
    },
    [onNetworkDrawerResize],
  );
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(true);
  const handleDrawerToggle = React.useCallback(() => {
    setIsDrawerOpen(curr => {
      const next = !curr;
      onNetworkDrawerResize(next ? NetworkDrawerConstants.DRAWER_MIN_WIDTH : 0);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
      return next;
    });
  }, [setIsDrawerOpen, onNetworkDrawerResize]);

  const panelControl = usePanelControl({
    initialState: {
      OVERVIEW: PANEL_STATE.OPEN,
      MAP_LAYERS: PANEL_STATE.COLLAPSED,
      IGNITION_STATE: PANEL_STATE.HIDDEN,
      ACCESS_POINTS: PANEL_STATE.HIDDEN,
      UPGRADE_PROGRESS: PANEL_STATE.HIDDEN,
      TOPOLOGY: PANEL_STATE.HIDDEN,
      DEFAULT_ROUTES: PANEL_STATE.HIDDEN,
      ANNOTATIONS: PANEL_STATE.HIDDEN,
    },
  });
  const {
    setPanelState,
    getIsOpen,
    getIsHidden,
    getIsCollapsed,
    toggleOpen,
    collapseAll,
    getIsAnyOpen,
  } = panelControl;

  // this state is for the TopologyBuilderPanel forms
  const topologyBuilderForm = useTopologyBuilderForm();
  const {updateForm} = topologyBuilderForm;

  const shouldOpenOverview = !(
    getIsAnyOpen() &&
    getIsCollapsed(PANELS.OVERVIEW) &&
    getIsCollapsed(PANELS.MAP_LAYERS)
  );

  React.useEffect(() => {
    if (!selectedElement && !getIsAnyOpen() && shouldOpenOverview) {
      return setPanelState(PANELS.OVERVIEW, PANEL_STATE.OPEN);
    }
  }, [
    selectedElement,
    shouldOpenOverview,
    getIsAnyOpen,
    collapseAll,
    setPanelState,
  ]);

  const upgradeReq = upgrade_state.curReq.urReq;
  const showUpgradeProgressPanel =
    upgradeReq.upgradeReqId &&
    (upgradeReq.urType === UpgradeReqType.PREPARE_UPGRADE ||
      upgradeReq.urType === UpgradeReqType.COMMIT_UPGRADE);
  React.useEffect(() => {
    // open the panel once, if an upgrade is in progress and the panel is hidden
    if (showUpgradeProgressPanel && getIsHidden(PANELS.UPGRADE_PROGRESS)) {
      setPanelState(PANELS.UPGRADE_PROGRESS, PANEL_STATE.OPEN);
    } else {
      setPanelState(PANELS.UPGRADE_PROGRESS, PANEL_STATE.HIDDEN);
    }
  }, [showUpgradeProgressPanel, getIsHidden, setPanelState]);

  const handleEditTopology = React.useCallback(
    (
      params: EditTopologyElementParams,
      type: $Values<typeof TOPOLOGY_ELEMENT>,
    ) => {
      collapseAll();
      updateForm({
        params,
        formType: FORM_TYPE.EDIT,
      });
      if (type === TOPOLOGY_ELEMENT.SITE) {
        if (
          typeof params?.location !== 'undefined' &&
          params?.location != null
        ) {
          setLocation({...params.location});
        }
        setPanelState(PANELS.TOPOLOGY_SITE, PANEL_STATE.OPEN);
      } else if (type === TOPOLOGY_ELEMENT.NODE) {
        setPanelState(PANELS.TOPOLOGY_NODE, PANEL_STATE.OPEN);
      } else if (type === TOPOLOGY_ELEMENT.LINK) {
        setPanelState(PANELS.TOPOLOGY_LINK, PANEL_STATE.OPEN);
      }
    },
    [collapseAll, updateForm, setPanelState, setLocation],
  );
  const handleAddTopology = React.useCallback(
    (
      params: EditTopologyElementParams,
      type: $Values<typeof TOPOLOGY_ELEMENT>,
    ) => {
      collapseAll();
      updateForm({
        params,
        formType: FORM_TYPE.CREATE,
      });
      if (type === TOPOLOGY_ELEMENT.SITE) {
        if (
          typeof params?.location !== 'undefined' &&
          params?.location != null
        ) {
          setLocation({...params.location});
        }
        setPanelState(PANELS.TOPOLOGY_SITE, PANEL_STATE.OPEN);
      } else if (type === TOPOLOGY_ELEMENT.NODE) {
        setPanelState(PANELS.TOPOLOGY_NODE, PANEL_STATE.OPEN);
      } else if (type === TOPOLOGY_ELEMENT.LINK) {
        setPanelState(PANELS.TOPOLOGY_LINK, PANEL_STATE.OPEN);
      }
    },
    [collapseAll, updateForm, setLocation, setPanelState],
  );

  const showOverviewPanel = !(
    mapMode === MAPMODE.NETWORK_TEST || mapMode === MAPMODE.SCAN_SERVICE
  );

  return (
    <Drawer
      variant="permanent"
      classes={{paper: classes.drawerPaper}}
      style={drawerDimensions}
      anchor="right">
      <div className={classes.appBarSpacer} />
      <div className={classes.draggerContainer}>
        <Dragger
          direction="horizontal"
          minSize={NetworkDrawerConstants.DRAWER_MIN_WIDTH}
          maxSize={NetworkDrawerConstants.DRAWER_MAX_WIDTH}
          onResize={handleHorizontalResize}
        />
      </div>
      <div className={classes.content}>
        {showUpgradeProgressPanel ? (
          <UpgradeProgressPanel
            expanded={getIsOpen(PANELS.UPGRADE_PROGRESS)}
            onPanelChange={() => toggleOpen(PANELS.UPGRADE_PROGRESS)}
            topology={topology}
            nodeMap={nodeMap}
            upgradeStateDump={upgrade_state}
            statusReports={status_dump.statusReports}
          />
        ) : null}

        {showOverviewPanel && (
          <OverviewPanel
            expanded={getIsOpen(PANELS.OVERVIEW)}
            onPanelChange={() => {
              toggleOpen(PANELS.OVERVIEW);
            }}
            networkConfig={context.networkConfig}
            networkLinkHealth={networkLinkHealth}
            onViewIgnitionState={() => {
              setPanelState(PANELS.IGNITION_STATE, PANEL_STATE.OPEN);
              setPanelState(PANELS.OVERVIEW, PANEL_STATE.COLLAPSED);
            }}
            onViewAccessPointList={() => {
              setPanelState(PANELS.ACCESS_POINTS, PANEL_STATE.OPEN);
              setPanelState(PANELS.OVERVIEW, PANEL_STATE.COLLAPSED);
            }}
          />
        )}
        {mapMode === MAPMODE.NETWORK_TEST && (
          <NetworkTestPanel expanded={true} networkTestId={networkTestId} />
        )}
        {mapMode === MAPMODE.SCAN_SERVICE && (
          <ScanServicePanel expanded={true} scanId={scanId} />
        )}
        <MapLayersPanel
          {...mapLayersProps}
          networkName={networkName}
          expanded={getIsOpen(PANELS.MAP_LAYERS)}
          onPanelChange={() => toggleOpen(PANELS.MAP_LAYERS)}
        />
        <NetworkPlanningPanel panelControl={panelControl} />
        <L2TunnelPanel panelControl={panelControl} />
        <UploadTopologyPanel panelControl={panelControl} />

        <Slide
          {...SlideProps}
          unmountOnExit
          in={!getIsHidden(PANELS.IGNITION_STATE)}>
          <IgnitionStatePanel
            expanded={getIsOpen(PANELS.IGNITION_STATE)}
            onPanelChange={() => toggleOpen(PANELS.IGNITION_STATE)}
            onClose={() =>
              setPanelState(PANELS.IGNITION_STATE, PANEL_STATE.HIDDEN)
            }
            networkName={networkName}
            ignitionState={ignition_state}
            refreshNetworkConfig={context.refreshNetworkConfig}
          />
        </Slide>

        <Slide
          {...SlideProps}
          unmountOnExit
          in={!getIsHidden(PANELS.ACCESS_POINTS)}>
          <AccessPointsPanel
            expanded={getIsOpen(PANELS.ACCESS_POINTS)}
            onPanelChange={() => toggleOpen(PANELS.OVERVIEW)}
            onClose={() =>
              setPanelState(PANELS.ACCESS_POINTS, PANEL_STATE.HIDDEN)
            }
            onSelectSite={siteName =>
              context.setSelected(TOPOLOGY_ELEMENT.SITE, siteName)
            }
            topology={topology}
            wirelessController={wireless_controller}
            wirelessControllerStats={wireless_controller_stats}
          />
        </Slide>

        {Object.keys(searchNearbyProps.nearbyNodes).map(txNode => (
          <SearchNearby
            nodeName={txNode}
            searchNearbyProps={searchNearbyProps}
            panelControl={panelControl}
            onAddTopology={handleAddTopology}
          />
        ))}

        {topologyElements.map(el => (
          <RenderTopologyElement
            key={el.name}
            element={el}
            panelControl={panelControl}
            searchNearbyProps={searchNearbyProps}
            onEditTopology={handleEditTopology}
          />
        ))}

        <DefaultRouteHistoryPanel panelControl={panelControl} />
        <RemoteOverlayMetadataPanel panelControl={panelControl} />
        <TopologyBuilderPanel
          panelControl={panelControl}
          panelForm={topologyBuilderForm}
          siteProps={siteProps}
        />
        <AnnotationsPanel panelControl={panelControl} />
        <DrawerToggleButton
          drawerWidth={networkDrawerWidth}
          isOpen={isDrawerOpen}
          onDrawerToggle={handleDrawerToggle}
        />
      </div>
    </Drawer>
  );
}
