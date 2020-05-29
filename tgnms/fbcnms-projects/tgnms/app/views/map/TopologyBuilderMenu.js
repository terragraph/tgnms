/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AddIcon from '@material-ui/icons/Add';
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
import mapboxgl from 'mapbox-gl';
import {
  FormType,
  SlideProps,
  TopologyElement,
} from '../../constants/MapPanelConstants';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {UploadTopologyPanel} from '../../components/mappanels/UploadTopologyPanel';
import {convertType} from '../../helpers/ObjectHelpers';
import {makeStyles} from '@material-ui/styles';
import {useCallback, useContext, useEffect, useState} from 'react';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';

import type {
  EditLinkParams,
  EditNodeParams,
  PlannedSiteProps,
} from '../../components/mappanels/MapPanelTypes';
import type {SiteType} from '../../../shared/types/Topology';

const useStyles = makeStyles(theme => ({
  addButton: {
    position: 'fixed',
    right: 0,
    bottom: 0,
    margin: theme.spacing(2),
  },
}));

type Props = {
  plannedSiteProps: PlannedSiteProps,
  editTopologyElement: ?boolean,
  addTopologyElementType: ?$Values<typeof TopologyElement>,
  params: ?$Shape<EditNodeParams> | EditLinkParams | $Shape<SiteType>,
  mapRef: ?mapboxgl.Map,
  updateTopologyPanelExpanded: boolean => void,
};

type PanelProps<T> = {
  panelExpanded: boolean,
  showPanel: boolean,
  panelParams: T,
  formType?: $Values<typeof FormType>,
};

export default function TopologyBuilderMenu(props: Props) {
  // Render the FAB with topology builder actions (add node/link/site)
  const {
    plannedSiteProps,
    updateTopologyPanelExpanded,
    editTopologyElement,
  } = props;
  const context = useContext(NetworkContext);

  const {networkConfig, networkName, selectedElement, setSelected} = context;
  const {controller_version, topology} = networkConfig;
  const classes = useStyles();

  const menuAnchorEl = React.useRef<?HTMLElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [siteName, setSiteName] = useState(null);
  const [uploadTopologyPanel, setUploadTopologyPanel] = useState<
    PanelProps<{}>,
  >({});
  const [sitePanel, setSitePanel] = useState<PanelProps<$Shape<SiteType>>>({});
  const [linkPanel, setLinkPanel] = useState<PanelProps<EditLinkParams>>({});
  const [nodePanel, setNodePanel] = useState<
    PanelProps<$Shape<EditNodeParams>>,
  >({});

  const showPanelProps = {
    panelExpanded: true,
    showPanel: true,
    panelParams: {},
    formType: editTopologyElement ? FormType.EDIT : FormType.CREATE,
  };

  const editPanel = useCallback(editPanelCallback, [editPanelCallback]);

  const onRemovePlannedSite = useCallback(onRemovePlannedSiteCallback, [
    onRemovePlannedSiteCallback,
  ]);

  function editPanelCallback(
    name: $Values<typeof TopologyElement>,
    overrides?: $Shape<PanelProps<*>>,
  ) {
    if (name === TopologyElement.link) {
      setLinkPanel({
        ...linkPanel,
        ...overrides,
        panelParams: convertType<EditLinkParams>(overrides?.panelParams),
      });
    } else if (name === TopologyElement.site) {
      setSitePanel({
        ...sitePanel,
        ...overrides,
        panelParams: convertType<$Shape<SiteType>>(overrides?.panelParams),
      });
    } else if (name === TopologyElement.node) {
      setNodePanel({
        ...nodePanel,
        ...overrides,
        panelParams:
          convertType<$Shape<EditNodeParams>>(overrides?.panelParams) || {},
      });
    } else if (name === TopologyElement.upload) {
      setUploadTopologyPanel({
        ...uploadTopologyPanel,
        ...overrides,
        panelParams: {},
      });
    }
  }

  useEffect(() => {
    const {params, addTopologyElementType, updateTopologyPanelExpanded} = props;

    if (addTopologyElementType === TopologyElement.site) {
      editPanel(TopologyElement.site, {...showPanelProps, panelParams: params});
      updateTopologyPanelExpanded(true);
      onAddPlannedSite(convertType<$Shape<SiteType>>(params)?.location);
    } else if (addTopologyElementType === TopologyElement.node) {
      editPanel(TopologyElement.node, {...showPanelProps, panelParams: params});
      updateTopologyPanelExpanded(true);
    } else if (addTopologyElementType === TopologyElement.link) {
      editPanel(TopologyElement.link, {...showPanelProps, panelParams: params});
      updateTopologyPanelExpanded(true);
    }
  });

  const enqueueSnackbar = useEnqueueSnackbar();

  const handleTopologyChangeSnackbar = (changeMessage: string) => {
    if (changeMessage === 'success') {
      enqueueSnackbar(
        'Topology successfully changed! Please wait a few moments for the topology to update.',
        {variant: 'success'},
      );
    } else {
      enqueueSnackbar('Topology change failed: ' + changeMessage, {
        variant: 'error',
      });
    }
  };

  const onCloseTopologyPanel = useCallback(onCloseTopologyPanelCallback, [
    onCloseTopologyPanelCallback,
  ]);

  const handleActionsMenuOpen = useCallback(
    ev => {
      menuAnchorEl.current = ev.currentTarget;
      setShowMenu(true);
    },
    [menuAnchorEl, setShowMenu],
  );

  const handleNodePanelChange = useCallback(
    () =>
      editPanel(TopologyElement.node, {
        panelExpanded: !nodePanel.panelExpanded,
      }),
    [editPanel, nodePanel.panelExpanded],
  );

  const handleNodePanelClose = useCallback(
    (changeMessage?: string) => {
      // If editing a node and nothing else is selected,
      // re-select the node onClose
      const {formType, panelParams} = nodePanel;
      if (formType === FormType.EDIT && !selectedElement) {
        setSelected(TopologyElementType.NODE, panelParams?.name);
      }
      onCloseTopologyPanel(TopologyElement.node, changeMessage);
    },
    [setSelected, onCloseTopologyPanel, nodePanel, selectedElement],
  );

  const handleLinkPanelChange = useCallback(
    () =>
      editPanel(TopologyElement.link, {
        panelExpanded: !linkPanel.panelExpanded,
      }),
    [editPanel, linkPanel.panelExpanded],
  );

  const handleLinkPanelClose = useCallback(
    (changeMessage?: string) => {
      onCloseTopologyPanel(TopologyElement.link, changeMessage);
    },
    [onCloseTopologyPanel],
  );

  const handleSitePanelChange = useCallback(
    () =>
      editPanel(TopologyElement.site, {
        panelExpanded: !sitePanel.panelExpanded,
      }),
    [editPanel, sitePanel.panelExpanded],
  );

  const handleSitePanelClose = useCallback(
    (changeMessage?: string) => {
      // Hide the planned state feature on the map
      onRemovePlannedSite();
      // If editing a site and nothing else is selected,
      // re-select the site onClose
      const {formType, panelParams} = sitePanel;
      if (formType === FormType.EDIT && !selectedElement) {
        setSelected(TopologyElementType.SITE, panelParams?.name || '');
      }
      onCloseTopologyPanel(TopologyElement.site, changeMessage);
    },
    [
      setSelected,
      onRemovePlannedSite,
      selectedElement,
      sitePanel,
      onCloseTopologyPanel,
    ],
  );

  const onAddTopology = useCallback(onAddTopologyCallback, [
    onAddTopologyCallback,
  ]);

  const onAddPlannedSite = useCallback(onAddPlannedSiteCallback, [
    onAddPlannedSiteCallback,
  ]);

  const onAddNode = useCallback(
    () => onAddTopology<EditNodeParams>(TopologyElement.node),
    [onAddTopology],
  );

  const onAddSite = useCallback(() => {
    onAddPlannedSite();
    onAddTopology<SiteType>(TopologyElement.site);
  }, [onAddPlannedSite, onAddTopology]);

  const onAddLink = useCallback(
    () => onAddTopology<EditLinkParams>(TopologyElement.link),
    [onAddTopology],
  );

  const onUploadTopology = useCallback(
    () => onAddTopology<{}>(TopologyElement.upload),
    [onAddTopology],
  );

  const handleUploadTopologyPanelChange = useCallback(
    () =>
      editPanel(TopologyElement.upload, {
        panelExpanded: !uploadTopologyPanel.panelExpanded,
      }),
    [editPanel, uploadTopologyPanel.panelExpanded],
  );

  const handleUploadTopologyPanelClose = useCallback(
    (changeMessage?: string) => {
      onCloseTopologyPanel(TopologyElement.upload, changeMessage);
    },
    [onCloseTopologyPanel],
  );

  function onCloseTopologyPanelCallback(
    type: $Values<typeof TopologyElement>,
    changeMessage?: string,
  ) {
    editPanel(type, {
      showPanel: false,
      panelParams: {},
    });
    updateTopologyPanelExpanded(false);
    if (changeMessage !== undefined) {
      handleTopologyChangeSnackbar(changeMessage);
    }
  }

  function onAddTopologyCallback<T>(
    type: $Values<typeof TopologyElement>,
    params?: $Shape<T>,
  ) {
    editPanel(type, {...showPanelProps, panelParams: params});
    setShowMenu(false);
    updateTopologyPanelExpanded(true);
  }

  function onRemovePlannedSiteCallback() {
    // Remove the planned site from the map
    const {onUpdatePlannedSite, unhideSite} = plannedSiteProps;

    // Stop editing the previous site
    if (siteName) {
      unhideSite(siteName);
      setSiteName(null);
    }
    onUpdatePlannedSite(null);
  }

  function onAddPlannedSiteCallback(location) {
    // Add a planned site to the map
    const {mapRef, plannedSiteProps} = props;
    const {plannedSite, onUpdatePlannedSite, unhideSite} = plannedSiteProps;

    // If there's already a planned site...
    if (plannedSite && sitePanel.formType === FormType.EDIT && siteName) {
      // Stop editing the previous site
      unhideSite(siteName);
      setSiteName(null);
    }

    // Set initial position to the center of the map, or the provided location
    let initialPosition = {latitude: 0, longitude: 0};
    if (location) {
      const {latitude, longitude} = location;
      initialPosition = {latitude, longitude};
    } else if (mapRef?.current) {
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
  }

  return (
    <>
      <Slide {...SlideProps} unmountOnExit in={nodePanel.showPanel}>
        <AddNodePanel
          expanded={nodePanel.panelExpanded}
          onPanelChange={handleNodePanelChange}
          onClose={handleNodePanelClose}
          formType={nodePanel.formType || FormType.CREATE}
          initialParams={nodePanel.panelParams}
          ctrlVersion={controller_version}
          networkConfig={networkConfig}
          networkName={networkName}
          topology={topology}
        />
      </Slide>
      <Slide {...SlideProps} unmountOnExit in={linkPanel.showPanel}>
        <AddLinkPanel
          expanded={linkPanel.panelExpanded}
          onPanelChange={handleLinkPanelChange}
          onClose={handleLinkPanelClose}
          initialParams={linkPanel.panelParams}
          topology={topology}
          networkName={networkName}
          nodeMap={context.nodeMap}
          linkMap={context.linkMap}
          nodeToLinksMap={context.nodeToLinksMap}
        />
      </Slide>
      <Slide {...SlideProps} unmountOnExit in={sitePanel.showPanel}>
        <AddSitePanel
          expanded={sitePanel.panelExpanded}
          onPanelChange={handleSitePanelChange}
          onClose={handleSitePanelClose}
          formType={sitePanel.formType || FormType.CREATE}
          initialParams={{
            ...sitePanel?.panelParams?.location,
            name: sitePanel?.panelParams?.name,
          }}
          networkName={networkName}
          plannedSite={plannedSiteProps.plannedSite}
          onUpdatePlannedSite={plannedSiteProps.onUpdatePlannedSite}
          topology={topology}
        />
      </Slide>
      <Slide {...SlideProps} unmountOnExit in={uploadTopologyPanel.showPanel}>
        <UploadTopologyPanel
          expanded={uploadTopologyPanel.panelExpanded}
          onClose={handleUploadTopologyPanelClose}
          onPanelChange={handleUploadTopologyPanelChange}
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
        <MenuItem onClick={onAddNode}>
          <ListItemIcon>{<RouterIcon />}</ListItemIcon>
          <ListItemText primary="Add Node" />
        </MenuItem>
        <MenuItem onClick={onAddLink}>
          <ListItemIcon>{<CompareArrowsIcon />}</ListItemIcon>
          <ListItemText primary="Add Link" />
        </MenuItem>
        <MenuItem onClick={onAddSite}>
          <ListItemIcon>{<AddLocationIcon />}</ListItemIcon>
          <ListItemText primary="Add Planned Site" />
        </MenuItem>
        <MenuItem onClick={onUploadTopology}>
          <ListItemIcon>{<PublishIcon />}</ListItemIcon>
          <ListItemText primary="Upload Topology File" />
        </MenuItem>
      </Menu>
    </>
  );
}
