/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import CustomTable from '@fbcnms/tg-nms/app/components/common/CustomTable';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import InputAdornment from '@material-ui/core/InputAdornment';
import NmsOptionsContext from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import React from 'react';
import ScanPanelTitle from './ScanPanelTitle';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import UploadTopologyConfirmationModal from '@fbcnms/tg-nms/app/views/map/mappanels/UploadTopologyConfirmationModal';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {
  NodeTypeValueMap,
  PolarityTypeValueMap,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {getNodePolarities} from '@fbcnms/tg-nms/app/helpers/TgFeatures';
import {
  locToPos,
  locationMidpoint,
} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeLinkName} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {makeStyles} from '@material-ui/styles';
import {reorderLinkNodes} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {sendTopologyBuilderRequest} from '@fbcnms/tg-nms/app/helpers/MapPanelHelpers';
import {uploadTopologyBuilderRequest} from '@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {ExecutionResultDataType} from '@fbcnms/tg-nms/shared/dto/ScanServiceTypes';
import type {
  LinkMap,
  MacToNodeMap,
  NetworkConfig,
  NodeMap,
} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NodeType} from '@fbcnms/tg-nms/shared/types/Topology';
import type {UploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

type NewLinkType = {
  name: string,
  snr: number,
  aNodeName: string,
  aNodeMac: string,
  zNodeName: string,
  zNodeMac: string,
};

type Props = {
  onBack: () => void,
  results: Array<ExecutionResultDataType>,
  startDate: Date,
};

const useStyles = makeStyles(theme => ({
  customTableWrapper: {
    paddingTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    marginLeft: -theme.spacing(3),
    marginRight: -theme.spacing(3),
    height: theme.spacing(40),
    fontSize: '14px',
  },
}));

export default function ScanConnectivity(props: Props) {
  const {onBack, results, startDate} = props;
  const classes = useStyles();
  const {updateNetworkMapOptions, networkMapOptions} = React.useContext(
    NmsOptionsContext,
  );
  const {temporarySelectedAsset} = networkMapOptions;
  const {
    macToNodeMap,
    networkName,
    nodeMap,
    siteMap,
    linkMap,
    networkConfig,
  } = useNetworkContext();
  const snackbars = useSnackbars();
  const {moveMapTo} = useMapContext();

  const [selectedLink, setSelectedLink] = React.useState(null);

  const {formState, handleInputChange} = useForm({
    initialState: {
      filterString: '',
      filterSNR: 15,
    },
  });

  const connectivityLinks = React.useMemo(
    () =>
      parseConnectivity(results, macToNodeMap, linkMap, nodeMap, networkConfig),
    [results, macToNodeMap, linkMap, nodeMap, networkConfig],
  );

  const potentialLinks = React.useMemo(
    () =>
      connectivityLinks.filter(
        connectivityLink =>
          connectivityLink.name.includes(formState.filterString) &&
          connectivityLink.snr >= formState.filterSNR,
      ),
    [connectivityLinks, formState.filterSNR, formState.filterString],
  );

  const newLink = React.useMemo(
    () =>
      potentialLinks.find(
        potentialLink => potentialLink.name === selectedLink?.link_name,
      ),
    [potentialLinks, selectedLink],
  );

  React.useEffect(() => {
    const temporaryTopology = {
      nodes: [],
      links: [],
      sites: [],
    };
    potentialLinks.map(potentialLink => {
      const locationA =
        siteMap[nodeMap[potentialLink.aNodeName]?.site_name]?.location;
      const locationZ =
        siteMap[nodeMap[potentialLink.zNodeName]?.site_name]?.location;
      temporaryTopology.links.push({
        name: potentialLink.name,
        locationA,
        locationZ,
      });
    });
    updateNetworkMapOptions({
      temporaryTopology,
    });
  }, [potentialLinks, siteMap, nodeMap, updateNetworkMapOptions]);

  const handleRowSelect = row => {
    const selectedLinkName = row.link_name;
    setSelectedLink(row);
    updateNetworkMapOptions({
      temporarySelectedAsset: {
        name: selectedLinkName,
        type: 'link',
        expanded: false,
      },
    });

    const temporaryLink = networkMapOptions.temporaryTopology?.links.find(
      link => link.name === selectedLinkName,
    );
    if (temporaryLink) {
      const location = locationMidpoint(
        temporaryLink?.locationA,
        temporaryLink?.locationZ,
      );
      moveMapTo({
        center: locToPos(location),
      });
    }
  };

  const handleBack = React.useCallback(() => {
    if (selectedLink) {
      setSelectedLink(null);
      updateNetworkMapOptions({
        temporarySelectedAsset: null,
      });
    } else {
      onBack();
    }
  }, [selectedLink, onBack, setSelectedLink, updateNetworkMapOptions]);

  const potentialTopologyAddition = React.useMemo(() => {
    const cnLinks = potentialLinks.filter(potentialLink =>
      getBackupLinkEligibility(
        potentialLink.aNodeName,
        potentialLink.zNodeName,
        nodeMap,
      ),
    );

    const potentialCnLinks = cnLinks.map(cnLink => ({
      a_node_name: cnLink.aNodeName,
      z_node_name: cnLink.zNodeName,
      link_type: 1,
      a_node_mac: cnLink.aNodeMac,
      z_node_mac: cnLink.zNodeMac,
      is_backup_cn_link: true,
    }));

    return {links: potentialCnLinks, nodes: [], sites: []};
  }, [potentialLinks, nodeMap]);

  const handleTopologyChangeClose = React.useCallback(
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

  const handleAddAllBackupLinks = React.useCallback(
    () =>
      uploadTopologyBuilderRequest(
        potentialTopologyAddition,
        networkName,
        handleTopologyChangeClose,
      ),
    [networkName, handleTopologyChangeClose, potentialTopologyAddition],
  );

  const _addLink = React.useCallback(
    ({isBackup}: {isBackup: boolean}) => {
      if (newLink != undefined) {
        const link = reorderLinkNodes({
          a_node_name: newLink.aNodeName,
          z_node_name: newLink.zNodeName,
          link_type: 1,
          a_node_mac: newLink.aNodeMac,
          z_node_mac: newLink.zNodeMac,
          is_backup_cn_link: isBackup,
        });
        sendTopologyBuilderRequest(
          networkName,
          'addLink',
          {link},
          handleTopologyChangeClose,
        );
      }
    },
    [newLink, networkName, handleTopologyChangeClose],
  );

  const handleAddLink = () => {
    _addLink({isBackup: false});
  };

  const handleAddBackupLink = () => {
    _addLink({isBackup: true});
  };

  const tableProps = React.useMemo(() => {
    const tableDimensions = {
      rowHeight: 50,
      headerHeight: 0,
      overscanRowCount: 10,
    };

    const rows = potentialLinks
      ? potentialLinks.map(potentialLink => ({
          link_name: potentialLink.name,
          snr: potentialLink.snr,
        }))
      : [];

    const columns = [
      {
        label: '',
        key: 'link_name',
        width: 215,
        render: (linkName: string) => <div>{linkName}</div>,
      },
      {
        label: '',
        key: 'snr',
        width: 90,
        render: (snr: string) => <div>{snr}</div>,
      },
    ];

    return {
      ...tableDimensions,
      columns,
      data: rows,
    };
  }, [potentialLinks]);

  React.useEffect(() => {
    const rows = tableProps.data;
    if (temporarySelectedAsset) {
      const row = rows.find(
        row => row.link_name === temporarySelectedAsset.name,
      );

      if (row != undefined) {
        setSelectedLink(row);
      }
    }
  }, [tableProps, temporarySelectedAsset]);

  const possibleBackupLink = React.useMemo(() => {
    if (!newLink) {
      return false;
    }
    return getBackupLinkEligibility(
      newLink.aNodeName,
      newLink.zNodeName,
      nodeMap,
    );
  }, [newLink, nodeMap]);

  return (
    <Grid container spacing={2}>
      <Grid item>
        <ScanPanelTitle
          title="Connectivity"
          startDate={startDate}
          onBack={handleBack}
        />
      </Grid>
      <Grid item>
        {selectedLink ? (
          <>
            <Typography variant="h6">{selectedLink.link_name}</Typography>
            <Typography variant="button">SNR: {selectedLink.snr}</Typography>
            <UploadTopologyConfirmationModal
              fullWidth={true}
              disabled={false}
              onSubmit={handleAddLink}
              getUploadTopology={() =>
                convertType<UploadTopologyType>({links: [selectedLink]})
              }
              customText={`Add Link To ${networkName}`}
            />
            {possibleBackupLink && (
              <UploadTopologyConfirmationModal
                fullWidth={true}
                disabled={false}
                onSubmit={handleAddBackupLink}
                getUploadTopology={() =>
                  convertType<UploadTopologyType>({links: [selectedLink]})
                }
                customText={`Add Link As CN backup link To ${networkName}`}
              />
            )}
          </>
        ) : (
          <>
            <Grid item container direction="column" spacing={1}>
              <Grid item>
                <FormLabel component="legend">
                  <span>Search</span>
                </FormLabel>
                <TextField
                  id="filterString"
                  variant="outlined"
                  value={formState.filterString}
                  InputLabelProps={{shrink: true}}
                  margin="dense"
                  fullWidth
                  onChange={handleInputChange(val => ({filterString: val}))}
                />
              </Grid>
              <Grid item>
                <FormLabel component="legend">
                  <span>Minimum SNR</span>
                </FormLabel>
                <TextField
                  id="filterSNR"
                  variant="outlined"
                  value={formState.filterSNR}
                  InputLabelProps={{shrink: true}}
                  margin="dense"
                  fullWidth
                  onChange={handleInputChange(val => ({filterSNR: val}))}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">dB</InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item />
              <Grid item>
                <Typography variant="button">
                  {`${potentialLinks.length} Potential Links Found`}
                </Typography>
              </Grid>
            </Grid>
            {potentialLinks.length > 0 && (
              <>
                <div
                  className={classes.customTableWrapper}
                  data-testid="drop-down-table">
                  <Grid container>
                    <Grid item xs={1} />
                    <Grid item xs={8}>
                      Link
                    </Grid>
                    <Grid item xs={3}>
                      SNR (dB)
                    </Grid>
                  </Grid>
                  <CustomTable {...tableProps} onRowSelect={handleRowSelect} />
                </div>
                <UploadTopologyConfirmationModal
                  disabled={false}
                  onSubmit={handleAddAllBackupLinks}
                  getUploadTopology={() => potentialTopologyAddition}
                  customText="Add All Possible Backup Links"
                />
              </>
            )}
          </>
        )}
      </Grid>
    </Grid>
  );
}

function parseConnectivity(
  scanData: Array<ExecutionResultDataType>,
  macToNodeMap: MacToNodeMap,
  linkMap: LinkMap,
  nodeMap: NodeMap,
  networkConfig: NetworkConfig,
): Array<NewLinkType> {
  const newLinks = scanData.reduce((result: Array<NewLinkType>, scanResult) => {
    const scanConnectivity = scanResult.connectivity;
    if (scanResult.tx_node === null || !scanConnectivity) {
      return result;
    }
    const potentialLinks = scanConnectivity
      .map(scanLink => {
        const aNodeName = macToNodeMap[scanLink.tx_node];
        const zNodeName = macToNodeMap[scanLink.rx_node];
        const newLinkName = makeLinkName(aNodeName, zNodeName);
        if (
          aNodeName == undefined ||
          zNodeName == undefined ||
          linkMap[newLinkName] ||
          getNodePolarity(nodeMap[aNodeName], networkConfig) ===
            getNodePolarity(nodeMap[zNodeName], networkConfig)
        ) {
          return {};
        }
        return {
          name: newLinkName,
          snr: scanLink.routes[0][2],
          aNodeName,
          aNodeMac: scanLink.tx_node,
          zNodeName,
          zNodeMac: scanLink.rx_node,
        };
      })
      .filter(potentialLink => Object.keys(potentialLink).length !== 0);
    result.push(...potentialLinks);
    return result;
  }, []);

  const dedupedLinkMap = new Map<string, NewLinkType>();
  for (const link of newLinks) {
    const existing = dedupedLinkMap.get(link.name);
    if (existing == null || link.snr > existing.snr) {
      dedupedLinkMap.set(link.name, link);
    }
  }

  return [...dedupedLinkMap.values()];
}

function getNodePolarity(node: NodeType, networkConfig: NetworkConfig) {
  const {controller_version, topologyConfig} = networkConfig;

  const mac2Polarity = getNodePolarities(
    controller_version,
    node,
    topologyConfig,
  );
  let nodePolarity = null;
  for (const mac of Object.keys(mac2Polarity)) {
    const macPolarity = mac2Polarity[mac];
    if (nodePolarity === null) {
      nodePolarity = macPolarity;
    } else if (nodePolarity !== macPolarity) {
      nodePolarity = PolarityTypeValueMap.HYBRID_ODD;
    }
  }
  return nodePolarity;
}

function getBackupLinkEligibility(aNodeName, zNodeName, nodeMap) {
  const aNodeType = nodeMap[aNodeName].node_type;
  const zNodeType = nodeMap[zNodeName].node_type;
  return (
    (aNodeType === NodeTypeValueMap.DN && zNodeType === NodeTypeValueMap.CN) ||
    (aNodeType === NodeTypeValueMap.CN && zNodeType === NodeTypeValueMap.DN)
  );
}
