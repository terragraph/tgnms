/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import CustomTable from '../../common/CustomTable';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import NetworkContext from '../../../contexts/NetworkContext';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import UploadTopologyConfirmationModal from '../topologyCreationPanels/UploadTopologyConfirmationModal';
import useForm from '../../../hooks/useForm';
import {NodeTypeValueMap} from '../../../../shared/types/Topology';
import {makeStyles} from '@material-ui/styles';
import {sendTopologyBuilderRequest} from '../../../helpers/MapPanelHelpers';
import {uploadTopologyBuilderRequest} from '../../../helpers/TopologyTemplateHelpers';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';

import type {ExecutionResultDataType} from '../../../../shared/dto/ScanServiceTypes';

type NewLinkType = {
  name: string,
  snr: number,
  aNodeName: string,
  aNodeMac: string,
  zNodeName: string,
  zNodeMac: string,
};

type Props = {onBack: () => void, results: Array<ExecutionResultDataType>};

const useStyles = makeStyles(theme => ({
  customTableWrapper: {
    paddingTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    marginLeft: -theme.spacing(3),
    marginRight: -theme.spacing(3),
    height: theme.spacing(40),
  },
  addAllButton: {},
}));

export default function ScanConnectivity(props: Props) {
  const {onBack, results} = props;
  const enqueueSnackbar = useEnqueueSnackbar();
  const classes = useStyles();
  const {updateNetworkMapOptions, networkMapOptions} = React.useContext(
    NmsOptionsContext,
  );
  const {temporarySelectedAsset} = networkMapOptions;
  const {macToNodeMap, networkName, nodeMap, siteMap} = React.useContext(
    NetworkContext,
  );

  const [selectedLink, setSelectedLink] = React.useState(null);

  const {formState, handleInputChange} = useForm({
    initialState: {
      filterString: '',
      filterSNR: 15,
    },
  });

  const connectivityLinks = React.useMemo(
    () => parseConnectivity(results, macToNodeMap),
    [results, macToNodeMap],
  );

  const potentialLinks = React.useMemo(
    () =>
      connectivityLinks.filter(
        connectivityLink =>
          connectivityLink.name.includes(formState.filterString) &&
          connectivityLink.snr > formState.filterSNR,
      ),
    [connectivityLinks, formState.filterSNR, formState.filterString],
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
    setSelectedLink(row);
    updateNetworkMapOptions({
      temporarySelectedAsset: {
        name: row.link_name,
        type: 'link',
        expanded: false,
      },
    });
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
    const cnLinks = potentialLinks.filter(
      potentialLink =>
        nodeMap[potentialLink.aNodeName]?.node_type === NodeTypeValueMap.CN ||
        nodeMap[potentialLink.zNodeName]?.node_type === NodeTypeValueMap.CN,
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

  const handleAddAllBackupLinks = React.useCallback(
    () =>
      uploadTopologyBuilderRequest(
        potentialTopologyAddition,
        networkName,
        handleTopologyChangeClose,
      ),
    [networkName, handleTopologyChangeClose, potentialTopologyAddition],
  );

  const handleAddLink = () => {
    const newLink = potentialLinks.find(
      potentialLink => potentialLink.name === selectedLink?.link_name,
    );
    if (newLink != undefined) {
      const link = {
        a_node_name: newLink.aNodeName,
        z_node_name: newLink.zNodeName,
        link_type: 1,
        a_node_mac: newLink.aNodeMac,
        z_node_mac: newLink.zNodeMac,
      };
      sendTopologyBuilderRequest(
        networkName,
        'addLink',
        {link},
        handleTopologyChangeClose,
      );
    }
  };

  const handleAddBackupLink = () => {
    const newLink = potentialLinks.find(
      potentialLink => potentialLink.name === selectedLink?.link_name,
    );
    if (newLink != undefined) {
      const link = {
        a_node_name: newLink.aNodeName,
        z_node_name: newLink.zNodeName,
        link_type: 1,
        a_node_mac: newLink.aNodeMac,
        z_node_mac: newLink.zNodeMac,
        is_backup_cn_link: true,
      };
      sendTopologyBuilderRequest(
        networkName,
        'addLink',
        {link},
        handleTopologyChangeClose,
      );
    }
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

  return (
    <>
      <Typography variant="body1">
        <IconButton
          size="small"
          data-testid="back-button"
          onClick={handleBack}
          color="secondary">
          <ChevronLeftIcon />
        </IconButton>
        Connectivity
      </Typography>
      {selectedLink ? (
        <>
          <Typography variant="h6">{selectedLink.link_name}</Typography>
          <Typography variant="button">SNR: {selectedLink.snr}</Typography>
          <UploadTopologyConfirmationModal
            disabled={false}
            onSubmit={handleAddLink}
            uploadTopology={{
              sites: [],
              nodes: [],
              links: [{a_node_name: '', z_node_name: ''}],
            }}
            customText={`Add Link To ${networkName}`}
          />
          <UploadTopologyConfirmationModal
            disabled={false}
            onSubmit={handleAddBackupLink}
            uploadTopology={{
              sites: [],
              nodes: [],
              links: [{a_node_name: '', z_node_name: ''}],
            }}
            customText={`Add Link As CN backup link To ${networkName}`}
          />
        </>
      ) : (
        <>
          <Grid item container direction="column" spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Search:</span>
              </FormLabel>
            </Grid>
            <Grid item>
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
          </Grid>
          <Grid item container direction="column" spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Minimum SNR in dB:</span>
              </FormLabel>
            </Grid>
            <Grid item>
              <TextField
                id="filterSNR"
                variant="outlined"
                value={formState.filterSNR}
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={handleInputChange(val => ({filterSNR: val}))}
              />
            </Grid>
          </Grid>

          <Typography variant="button">
            {`${potentialLinks.length} Potential Links Found`}
          </Typography>
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
            uploadTopology={potentialTopologyAddition}
            customText="Add All Possible Backup Links"
          />
        </>
      )}
    </>
  );
}

function parseConnectivity(scanData, macToNodeMap): Array<NewLinkType> {
  return scanData.reduce((result: Array<NewLinkType>, scanResult) => {
    const scanConnectivity = scanResult.connectivity;
    if (scanResult.tx_node === null || !scanConnectivity) {
      return result;
    }
    const potentialLinks = scanConnectivity.map(scanLink => {
      const aNodeName = macToNodeMap[scanLink.tx_node];
      const zNodeName = macToNodeMap[scanLink.rx_node];
      return {
        name: `link-${aNodeName}-${zNodeName}`,
        snr: scanLink.routes[0][2],
        aNodeName,
        aNodeMac: scanLink.tx_node,
        zNodeName,
        zNodeMac: scanLink.rx_node,
      };
    });
    result.push(...potentialLinks);

    return result;
  }, []);
}
