/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AddLinkPanel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/AddLinkPanel';
import AddNodePanel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/AddNodePanel';
import AddSitePanel from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/AddSitePanel';
import Slide from '@material-ui/core/Slide';
import {
  FORM_TYPE,
  SlideProps,
} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {
  TOPOLOGY_PANEL_OPTIONS,
  useTopologyBuilderContext,
} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {useAzimuthManager} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import {useCallback, useState} from 'react';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {usePlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {
  EditTopologyElementParams,
  TopologyBuilderState,
} from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/useTopologyBuilderForm';
import type {
  LocationType,
  SiteType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import type {SiteProps} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';

type Props = {|
  panelControl: PanelStateControl,
  panelForm: TopologyBuilderState<EditTopologyElementParams>,
  siteProps: SiteProps,
|};

export default function TopologyBuilderPanel(props: Props) {
  const {panelControl, panelForm, siteProps} = props;
  const {params, formType, updateForm} = panelForm;
  const azimuthManager = useAzimuthManager();
  const {unhideSite} = siteProps;
  const {collapseAll, setPanelState} = panelControl;
  const {mapboxRef} = useMapContext();
  const {
    networkConfig,
    networkName,
    selectedElement,
    setSelected,
  } = useNetworkContext();
  const {controller_version, topology, bounds} = networkConfig;
  const snackbars = useSnackbars();
  const {
    selectedTopologyPanel,
    setSelectedTopologyPanel,
  } = useTopologyBuilderContext();
  const {
    plannedSite,
    setLocation,
    update: updatePlannedSite,
  } = usePlannedSiteContext();
  const [siteName, setSiteName] = useState(null);

  const onAddPlannedSite = React.useCallback(
    (location?: LocationType) => {
      // Add a planned site to the map

      // If there's already a planned site...
      if (plannedSite && formType === FORM_TYPE.EDIT && siteName) {
        // Stop editing the previous site
        unhideSite(siteName);
        setSiteName(null);
      }

      // Set initial position to the center of the map, or the provided location
      let initialPosition = {latitude: 0, longitude: 0};
      if (location) {
        const {latitude, longitude} = location;
        initialPosition = {latitude, longitude};
      } else if (mapboxRef) {
        const {lat, lng} = mapboxRef.getCenter();
        initialPosition = {latitude: lat, longitude: lng};
      } else if (bounds) {
        // Use networkConfig if map reference isn't set (shouldn't happen...)
        const [[minLng, minLat], [maxLng, maxLat]] = bounds;
        const latitude = minLat + (maxLat - minLat) / 2;
        const longitude = minLng + (maxLng - minLng) / 2;
        initialPosition = {latitude, longitude};
      }
      setLocation(initialPosition);
    },
    [
      mapboxRef,
      formType,
      siteName,
      bounds,
      setLocation,
      plannedSite,
      unhideSite,
    ],
  );

  const onAddPlannedSiteRef = React.useRef(onAddPlannedSite);

  React.useEffect(() => {
    if (selectedTopologyPanel === TOPOLOGY_PANEL_OPTIONS.SITE) {
      onAddPlannedSiteRef.current();
    }
  }, [selectedTopologyPanel, onAddPlannedSiteRef]);

  React.useEffect(() => {
    if (selectedTopologyPanel != null) {
      collapseAll();
      updateForm({
        formType: FORM_TYPE.CREATE,
        params: {},
      });
      setPanelState(selectedTopologyPanel, PANEL_STATE.OPEN);
    }

    if (selectedTopologyPanel == null) {
      collapseAll();
    }
  }, [setPanelState, collapseAll, selectedTopologyPanel, updateForm]);

  const hidePanel = React.useCallback(
    (panelKey: string) => {
      setPanelState(panelKey, PANEL_STATE.HIDDEN);
      setSelectedTopologyPanel(null);
    },
    [setPanelState, setSelectedTopologyPanel],
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

  const handleNodePanelClose = useCallback(
    (changeMessage?: ?string) => {
      // If editing a node and nothing else is selected,
      // re-select the node onClose
      if (
        formType === FORM_TYPE.EDIT &&
        !selectedElement &&
        params &&
        typeof params.name === 'string' //coerce to EditNodeParams
      ) {
        setSelected(TOPOLOGY_ELEMENT.NODE, params.name);
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
        formType === FORM_TYPE.EDIT &&
        !selectedElement &&
        params &&
        typeof params.name === 'string' //coerce to EditSiteParams
      ) {
        setSelected(TOPOLOGY_ELEMENT.SITE, params?.name ?? '');
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
          azimuthManager={azimuthManager}
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
          azimuthManager={azimuthManager}
        />
      </Slide>
    </>
  );
}
