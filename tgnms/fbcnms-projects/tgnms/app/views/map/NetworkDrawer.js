/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AccessPointsPanel from '../../components/mappanels/AccessPointsPanel';
import DefaultRouteHistoryPanel from '../../components/mappanels/DefaultRouteHistoryPanel';
import Dragger from '../../components/common/Dragger';
import Drawer from '@material-ui/core/Drawer';
import DrawerToggleButton, {
  useDrawerToggle,
} from '../../components/common/DrawerToggleButton';
import IgnitionStatePanel from '../../components/mappanels/IgnitionStatePanel';
import LinkDetailsPanel from '../../components/mappanels/LinkDetailsPanel';
import MapLayersPanel from '../../components/mappanels/MapLayersPanel';
import NetworkTestPanel from '../../components/mappanels/NetworkTestPanel/NetworkTestPanel';
import NodeDetailsPanel from '../../components/mappanels/NodeDetailsPanel/NodeDetailsPanel';
import OverviewPanel from '../../components/mappanels/OverviewPanel';
import SearchNearbyPanel from '../../components/mappanels/SearchNearbyPanel';
import SiteDetailsPanel from '../../components/mappanels/SiteDetailsPanel';
import Slide from '@material-ui/core/Slide';
import TopologyBuilderMenu, {
  useTopologyBuilderForm,
} from './TopologyBuilderMenu';
import UpgradeProgressPanel from '../../components/mappanels/UpgradeProgressPanel';
import useLiveRef from '../../hooks/useLiveRef';
import useUnmount from '../../hooks/useUnmount';
import {
  FormType,
  SlideProps,
  TopologyElement,
} from '../../constants/MapPanelConstants';
import {MAPMODE, useMapContext} from '../../contexts/MapContext';
import {PANELS, PANEL_STATE, usePanelControl} from './usePanelControl';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {UpgradeReqTypeValueMap as UpgradeReqType} from '../../../shared/types/Controller';
import {get} from 'lodash';
import {makeStyles, useTheme} from '@material-ui/styles';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {useNetworkContext} from '../../contexts/NetworkContext';

import type {EditTopologyElementParams} from './TopologyBuilderMenu';
import type {Element} from '../../contexts/NetworkContext';
import type {Props as MapLayersProps} from '../../components/mappanels/MapLayersPanel';
import type {
  NearbyNodes,
  PlannedSiteProps,
  Routes,
} from '../../components/mappanels/MapPanelTypes';
import type {PanelStateControl} from './usePanelControl';

export const NetworkDrawerConstants = {
  DRAWER_MIN_WIDTH: 330,
  DRAWER_MAX_WIDTH: 800,
};

const styles = theme => ({
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
});

const useStyles = makeStyles(styles);
type SearchNearbyProps = {|
  nearbyNodes: NearbyNodes,
  onUpdateNearbyNodes: NearbyNodes => *,
|};

type Props = {|
  networkDrawerWidth: number,
  onNetworkDrawerResize: number => *,
  mapLayersProps: MapLayersProps,
  searchNearbyProps: SearchNearbyProps,
  routesProps: Routes,
  plannedSiteProps: PlannedSiteProps,
  networkTestId?: ?string,
|};

export default function NetworkDrawerFn({
  networkDrawerWidth,
  mapLayersProps,
  searchNearbyProps,
  routesProps,
  plannedSiteProps,
  networkTestId,
  ...props
}: Props) {
  const classes = useStyles();
  const drawerDimensions = {
    width: networkDrawerWidth,
    height: '100%',
  };
  const context = useNetworkContext();
  const {mapMode, mapboxRef} = useMapContext();
  const {
    networkName,
    networkLinkHealth,
    nodeMap,
    siteMap,
    siteToNodesMap,
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
  const plannedSitePropsRef = useLiveRef(plannedSiteProps);

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

  const handleHorizontalResize = width => {
    props.onNetworkDrawerResize(width);
    // Force map to resize
    window.dispatchEvent(new Event('resize'));
  };

  const panelControl = usePanelControl({
    initialState: {
      OVERVIEW: PANEL_STATE.OPEN,
      MAP_LAYERS: PANEL_STATE.COLLAPSED,
      IGNITION_STATE: PANEL_STATE.HIDDEN,
      ACCESS_POINTS: PANEL_STATE.HIDDEN,
      UPGRADE_PROGRESS: PANEL_STATE.HIDDEN,
      TOPOLOGY: PANEL_STATE.HIDDEN,
      DEFAULT_ROUTES: PANEL_STATE.HIDDEN,
    },
  });
  const {
    setPanelState,
    getIsOpen,
    getIsHidden,
    toggleOpen,
    collapseAll,
    getAll,
  } = panelControl;

  // this state is for the TopologyBuilderMenu forms
  const topologyBuilderForm = useTopologyBuilderForm();
  const {updateForm} = topologyBuilderForm;

  React.useEffect(() => {
    if (selectedElement) {
      return collapseAll();
    }
    const isAnyPanelOpen = objectValuesTypesafe<$Values<typeof PANEL_STATE>>(
      getAll(),
    ).includes(PANEL_STATE.OPEN);
    if (!isAnyPanelOpen) {
      return setPanelState(PANELS.OVERVIEW, PANEL_STATE.OPEN);
    }
  }, [selectedElement, getAll, collapseAll, setPanelState]);

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
      type: $Values<typeof TopologyElementType>,
    ) => {
      collapseAll();
      updateForm({
        params,
        formType: FormType.EDIT,
      });
      if (type === TopologyElement.site) {
        if (
          typeof params?.location !== 'undefined' &&
          params?.location != null
        ) {
          plannedSitePropsRef.current.onUpdatePlannedSite({
            ...params.location,
          });
        }
        setPanelState(PANELS.TOPOLOGY_SITE, PANEL_STATE.OPEN);
      } else if (type === TopologyElement.node) {
        setPanelState(PANELS.TOPOLOGY_NODE, PANEL_STATE.OPEN);
      } else if (type === TopologyElement.link) {
        setPanelState(PANELS.TOPOLOGY_LINK, PANEL_STATE.OPEN);
      }
    },
    [collapseAll, updateForm, setPanelState, plannedSitePropsRef],
  );
  const handleAddTopology = React.useCallback(
    (
      params: EditTopologyElementParams,
      _type: $Values<typeof TopologyElementType>,
    ) => {
      collapseAll();
      updateForm({
        params,
        formType: FormType.CREATE,
      });
    },
    [collapseAll, updateForm],
  );

  const {isOpen: isDrawerOpen, toggle: drawerToggle} = useDrawerToggle();
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

        {mapMode !== MAPMODE.NETWORK_TEST && (
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
          <NetworkTestPanel
            expanded={true}
            testId={networkTestId}
            routes={routesProps}
          />
        )}
        <MapLayersPanel
          {...mapLayersProps}
          networkName={networkName}
          expanded={getIsOpen(PANELS.MAP_LAYERS)}
          onPanelChange={() => toggleOpen(PANELS.MAP_LAYERS)}
        />

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
              setPanelState(PANELS.IGNITION_STATE, PANEL_STATE.HIDDEN)
            }
            onSelectSite={siteName =>
              context.setSelected(TopologyElementType.SITE, siteName)
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
            routesProps={routesProps}
            onEditTopology={handleEditTopology}
          />
        ))}

        {routesProps.node && (
          <Slide {...SlideProps} in={!getIsHidden(PANELS.DEFAULT_ROUTES)}>
            <DefaultRouteHistoryPanel
              networkName={networkName}
              topology={topology}
              node={nodeMap[routesProps?.node ?? '']}
              nodeMap={nodeMap}
              site={siteMap[nodeMap[routesProps?.node ?? ''].site_name]}
              siteNodes={
                siteToNodesMap[nodeMap[routesProps?.node ?? ''].site_name]
              }
              onClose={() =>
                setPanelState(PANELS.DEFAULT_ROUTES, PANEL_STATE.HIDDEN)
              }
              routes={routesProps}
            />
          </Slide>
        )}

        <TopologyBuilderMenu
          panelControl={panelControl}
          panelForm={topologyBuilderForm}
          plannedSiteProps={plannedSiteProps}
          mapRef={mapboxRef}
        />
        <DrawerToggleButton
          drawerWidth={networkDrawerWidth}
          isOpen={isDrawerOpen}
          onDrawerToggle={drawerToggle}
        />
      </div>
    </Drawer>
  );
}

function RenderTopologyElement({
  element,
  panelControl,
  searchNearbyProps,
  routesProps,
  onEditTopology,
}: {
  element: Element,
  panelControl: PanelStateControl,
  searchNearbyProps: SearchNearbyProps,
  routesProps: Routes,
  onEditTopology: (
    params: EditTopologyElementParams,
    type: $Values<typeof TopologyElement>,
  ) => *,
}) {
  const {setPanelState, getIsHidden, removePanel} = panelControl;
  const theme = useTheme();

  const {type, name, expanded} = element;
  const {
    networkConfig,
    pinnedElements,
    networkName,
    networkNodeHealth,
    networkLinkHealth,
    networkLinkMetrics,
    nodeMap,
    linkMap,
    siteMap,
    siteToNodesMap,
    toggleExpanded,
    setSelected,
    togglePin,
    removeElement,
  } = useNetworkContext();
  const {
    controller_version,
    ignition_state,
    status_dump,
    topology,
    wireless_controller_stats,
  } = networkConfig;

  const pinned = !!pinnedElements.find(
    el => el.type === type && el.name === name,
  );

  const panelKey = React.useMemo(() => `${type}-${name}`, [name, type]);

  // When this component first mounts, open it
  React.useEffect(() => {
    setPanelState(panelKey, PANEL_STATE.OPEN);
  }, [setPanelState, panelKey]);
  useUnmount(() => {
    removePanel(panelKey);
  });

  const isVisible = !getIsHidden(panelKey);
  const handleClosePanel = () => {
    removePanel(panelKey);
    setTimeout(() => {
      removeElement(type, name);
    }, theme.transitions.duration.leavingScreen + 100 /* to be safe */);
  };

  const onUpdateRoutes = React.useCallback(
    ({
      node,
      links,
      nodes,
    }: {
      node: ?string,
      links: {[string]: number},
      nodes: Set<string>,
    }) => {
      routesProps.onUpdateRoutes({
        node,
        links,
        nodes,
      });
      setPanelState(PANELS.DEFAULT_ROUTES, PANEL_STATE.OPEN);
    },
    [routesProps, setPanelState],
  );

  if (type === TopologyElementType.NODE) {
    const node = nodeMap[name];
    // hack to get around issues with flow
    const {node: _, ...routesPropsWithoutNode} = {
      ...routesProps,
      onUpdateRoutes,
    };
    return (
      <Slide {...SlideProps} key={name} in={isVisible}>
        <NodeDetailsPanel
          expanded={expanded}
          onPanelChange={() => toggleExpanded(type, name, !expanded)}
          networkName={networkName}
          nodeDetailsProps={{
            ctrlVersion: controller_version,
            node: node,
            statusReport: node
              ? status_dump.statusReports[node.mac_addr]
              : null,
            networkNodeHealth: networkNodeHealth,
            networkConfig: networkConfig,
            onSelectLink: linkName =>
              setSelected(TopologyElementType.LINK, linkName),
            onSelectSite: siteName =>
              setSelected(TopologyElementType.SITE, siteName),
            topology: topology,
          }}
          pinned={pinned}
          onPin={() => togglePin(type, name, !pinned)}
          onClose={handleClosePanel}
          onEdit={params => onEditTopology(params, TopologyElement.node)}
          {...searchNearbyProps}
          {...routesPropsWithoutNode}
          node={node}
        />
      </Slide>
    );
  } else if (type === TopologyElementType.LINK) {
    const link = linkMap[name];
    return (
      <Slide {...SlideProps} key={name} in={isVisible}>
        <LinkDetailsPanel
          expanded={expanded}
          onPanelChange={() => toggleExpanded(type, name, !expanded)}
          networkName={networkName}
          link={link}
          nodeMap={nodeMap}
          networkLinkHealth={networkLinkHealth}
          networkLinkMetrics={networkLinkMetrics}
          networkConfig={networkConfig}
          ignitionEnabled={
            !(
              ignition_state &&
              ignition_state.igParams.linkAutoIgnite[name] === false
            )
          }
          onClose={handleClosePanel}
          onSelectNode={nodeName =>
            setSelected(TopologyElementType.NODE, nodeName)
          }
          pinned={pinned}
          onPin={() => togglePin(type, name, !pinned)}
        />
      </Slide>
    );
  } else if (type === TopologyElementType.SITE) {
    const site = siteMap[name];
    const wapStats = get(wireless_controller_stats, [name.toLowerCase()], null);
    return (
      <Slide {...SlideProps} key={name} in={isVisible}>
        <SiteDetailsPanel
          expanded={expanded}
          onPanelChange={() => toggleExpanded(type, name, !expanded)}
          networkName={networkName}
          topology={topology}
          site={site}
          siteMap={siteMap}
          siteNodes={siteToNodesMap[name] || new Set()}
          nodeMap={nodeMap}
          networkLinkHealth={networkLinkHealth}
          wapStats={wapStats}
          onClose={handleClosePanel}
          onSelectNode={nodeName =>
            setSelected(TopologyElementType.NODE, nodeName)
          }
          pinned={pinned}
          onPin={() => togglePin(type, name, !pinned)}
          onEdit={params => onEditTopology(params, TopologyElement.site)}
          onUpdateRoutes={onUpdateRoutes}
        />
      </Slide>
    );
  }
  return null;
}

function SearchNearby({
  onAddTopology,
  nodeName,
  searchNearbyProps,
}: {
  nodeName: string,
  searchNearbyProps: {|
    nearbyNodes: NearbyNodes,
    onUpdateNearbyNodes: NearbyNodes => *,
  |},
  onAddTopology: (
    x: EditTopologyElementParams,
    t: $Values<typeof TopologyElement>,
  ) => *,
}) {
  const {networkName, networkConfig, nodeMap, siteMap} = useNetworkContext();
  const {topology} = networkConfig;
  const node = nodeMap[nodeName];

  return (
    <Slide {...SlideProps} in={true}>
      <SearchNearbyPanel
        networkName={networkName}
        topology={topology}
        node={node}
        site={siteMap[node.site_name]}
        onClose={() => {}}
        onAddNode={params => onAddTopology(params, TopologyElement.node)}
        onAddLink={params => onAddTopology(params, TopologyElement.link)}
        onAddSite={params => onAddTopology(params, TopologyElement.site)}
        {...searchNearbyProps}
      />
    </Slide>
  );
}
