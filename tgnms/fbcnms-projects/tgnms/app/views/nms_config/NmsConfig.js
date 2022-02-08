/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import * as FileSaver from 'file-saver';
import Button from '@material-ui/core/Button';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import EditIcon from '@material-ui/icons/Edit';
import FileDownloadIcon from '@material-ui/icons/CloudDownload';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import LoadingBox from '@fbcnms/tg-nms/app/components/common/LoadingBox';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ModalNmsConfigForm from './ModalNmsConfigForm';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import NetworkExport from './NetworkImportExport/NetworkExport';
import Paper from '@material-ui/core/Paper';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';
import React from 'react';
import StatusIndicator, {
  StatusIndicatorColor,
} from '@fbcnms/tg-nms/app/components/common/StatusIndicator';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import axios from 'axios';
import {GRAY_BORDER} from '@fbcnms/tg-nms/app/MaterialTheme';

import {makeStyles} from '@material-ui/styles';
import {requestWithConfirmation} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {useNetworkListContext} from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

const useStyles = makeStyles(theme => ({
  leftIcon: {
    paddingRight: theme.spacing(),
  },
  paper: {
    border: GRAY_BORDER,
    flexGrow: 1,
    padding: theme.spacing(),
    overflowX: 'auto',
  },
  table: {},
  headerCell: {
    fontWeight: 'bold',
  },
  row: {
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.background.default,
    },
  },
  flexRow: {
    display: 'flex',
    alignItems: 'center',
  },
  noWrap: {
    whiteSpace: 'nowrap',
  },
  vertCenter: {
    verticalAlign: 'middle',
  },
  centerText: {
    textAlign: 'center',
  },
  controllerInfo: {
    lineHeight: 1.5,
  },
  menuIconButton: {
    padding: 6,
    marginLeft: -12,
    marginRight: 4,
  },
  deleteIcon: {
    color: '#c0392a',
  },
}));

const columns = ['Network', 'Primary Controller', 'Backup Controller'];

export default function NmsConfig() {
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [menuNetworkName, setMenuNetworkName] = React.useState(null);
  const [modalProps, setModalProps] = React.useState({open: false});
  const classes = useStyles();
  const snackbars = useSnackbars();
  const {networkList, waitForNetworkListRefresh} = useNetworkListContext();

  const onCreateNetwork = (
    data,
    waitForNetworkListRefresh,
    onResolve,
    onReject,
  ) => {
    // Create a network
    axios
      .post(`/topology/create`, data)
      .then(response => {
        waitForNetworkListRefresh();
        snackbars.success('Network created!');
        onResolve && onResolve(response);
      })
      .catch(err => {
        const errorText =
          err.response && err.response.data && err.response.data.msg
            ? err.response.data.msg
            : 'Unable to create new network.';
        snackbars.error(errorText);
        onReject && onReject(err);
      });
  };

  const onEditNetwork = (
    data,
    waitForNetworkListRefresh,
    onResolve,
    onReject,
  ) => {
    // Edit a network
    axios
      .post(`/topology/update/${data.id}`, data)
      .then(response => {
        waitForNetworkListRefresh();
        snackbars.success('Network updated!');
        onResolve && onResolve(response);
      })
      .catch(err => {
        const errorText =
          err.response && err.response.data && err.response.data.msg
            ? err.response.data.msg
            : 'Unable to save.';
        snackbars.error(errorText);
        onReject && onReject(err);
      });
  };

  const onKMLSiteExport = networkName => {
    axios
      .get(`/export/${networkName}/sites`)
      .then(response => {
        try {
          const blob = new Blob([response.data], {
            type: 'text/plain;charset=utf-8',
          });
          FileSaver.saveAs(blob, `${networkName}_sites.kml`);
        } catch (error) {
          return Promise.reject(error);
        }
      })
      .catch(err => {
        const errorText =
          err.response && err.response.data && err.response.data.msg
            ? err.response.data.msg
            : 'Unable to export sites.';
        snackbars.error(errorText);
      });
  };

  const onDeleteNetwork = (
    id,
    waitForNetworkListRefresh,
    onResolve,
    onReject,
  ) => {
    // Delete a network
    axios
      .post(`/topology/delete/${id}`)
      .then(response => {
        waitForNetworkListRefresh();
        snackbars.success('Network deleted!');
        onResolve && onResolve(response);
      })
      .catch(err => {
        const errorText =
          err.response && err.response.data && err.response.data.msg
            ? err.response.data.msg
            : 'Unable to delete network.';
        snackbars.error(errorText);
        onReject && onReject(err);
      });
  };

  const handleMenuClose = () => {
    // Close the actions menu
    setMenuAnchorEl(null);
  };

  const handleModalClose = () => {
    // Close the form modal
    setModalProps({...modalProps, open: false});
  };

  const handleAddNetwork = () => {
    // Open the modal to add a new network
    setModalProps({open: true, type: 'CREATE'});
  };

  const handleEditNetwork = (networkConfig, _waitForNetworkListRefresh) => {
    // Open the modal to edit a network
    setModalProps({open: true, type: 'EDIT', networkConfig});
  };

  const handleKMLSiteExport = networkConfig => {
    // Download sites as KML file
    onKMLSiteExport(networkConfig.name);
  };

  const handleDeleteNetwork = (networkConfig, waitForNetworkListRefresh) => {
    // Delete the given network with confirmation
    const makeRequest = _requestData =>
      new Promise((resolve, reject) => {
        onDeleteNetwork(
          networkConfig.id,
          waitForNetworkListRefresh,
          resolve,
          reject,
        );
      });

    requestWithConfirmation(makeRequest, {
      desc: `The network <strong>${networkConfig.name}</strong> will be permanently deleted.`,
      descType: 'html',
      onResultsOverride: () => {},
    });
  };

  const renderControllerRow = controllerConfig => {
    // Render a controller's config as table cells
    // controller_online verifies both API service and the E2E
    const {
      api_ip,
      e2e_ip,
      api_port,
      e2e_port,
      controller_online,
    } = controllerConfig;
    const {GREEN, RED} = StatusIndicatorColor;

    return (
      <TableCell className={classes.noWrap} size="small">
        {api_ip ? (
          <span className={classes.flexRow}>
            <StatusIndicator color={controller_online ? GREEN : RED} />
            <span className={classes.controllerInfo}>
              <span>
                <strong>API:</strong> {api_ip} &nbsp;/&nbsp; {api_port}
              </span>
              <br />
              <span>
                <strong>E2E:</strong> {e2e_ip ? e2e_ip : <em>addr not set</em>}
                &nbsp;/&nbsp;
                {e2e_port ? e2e_port : <em>port not set</em>}
              </span>
            </span>
          </span>
        ) : (
          <em>not set</em>
        )}
      </TableCell>
    );
  };

  // render loading icon while waiting for network list
  if (!networkList) {
    return <LoadingBox />;
  }
  const hasNetworks = Object.keys(networkList).length > 0;

  return (
    <Grid container direction="column" data-testid="nms-config" spacing={2}>
      <Grid container item spacing={2}>
        <Grid item>
          <Button variant="outlined" onClick={handleAddNetwork}>
            <PlaylistAddIcon className={classes.leftIcon} />
            Add Network
          </Button>
        </Grid>
      </Grid>
      <Grid item>
        <Paper className={classes.paper} elevation={0}>
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell
                    key={col}
                    className={classes.headerCell}
                    size="small">
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            {networkList ? (
              <TableBody>
                {hasNetworks ? (
                  Object.keys(networkList).map(networkName => {
                    const networkConfig = networkList[networkName];
                    const {primary, backup} = networkConfig;
                    return (
                      <TableRow key={networkName} className={classes.row}>
                        <TableCell
                          className={classes.noWrap}
                          component="th"
                          scope="row"
                          size="small">
                          <IconButton
                            classes={{root: classes.menuIconButton}}
                            onClick={ev => {
                              setMenuAnchorEl(ev.currentTarget);
                              setMenuNetworkName(networkName);
                            }}>
                            <MoreVertIcon />
                          </IconButton>
                          <strong className={classes.vertCenter}>
                            {networkName}
                          </strong>
                        </TableCell>
                        {renderControllerRow(primary || {})}
                        {renderControllerRow(backup || {})}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      className={classes.centerText}
                      colSpan={columns.length}>
                      Click on the "Add Network" button to get started!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            ) : null}
          </Table>
        </Paper>
      </Grid>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        MenuListProps={{
          subheader: (
            <ListSubheader component="div">
              <strong>{menuNetworkName}</strong>
            </ListSubheader>
          ),
        }}
        onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleEditNetwork(
              networkList[menuNetworkName],
              waitForNetworkListRefresh,
            );
            handleMenuClose();
          }}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText primary="Edit Network" />
        </MenuItem>
        <NetworkExport
          networkConfig={networkList[menuNetworkName]}
          onComplete={() => {
            handleMenuClose();
          }}
        />
        <MenuItem
          onClick={() => {
            handleKMLSiteExport(networkList[menuNetworkName]);
            handleMenuClose();
          }}>
          <ListItemIcon>
            <FileDownloadIcon />
          </ListItemIcon>
          <ListItemText primary="KML Site Export" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDeleteNetwork(
              networkList[menuNetworkName],
              waitForNetworkListRefresh,
            );
            handleMenuClose();
          }}>
          <ListItemIcon>
            <DeleteForeverIcon className={classes.deleteIcon} />
          </ListItemIcon>
          <ListItemText primary="Delete Network" />
        </MenuItem>
      </Menu>

      <ModalNmsConfigForm
        {...modalProps}
        onClose={handleModalClose}
        onCreateNetwork={onCreateNetwork}
        onEditNetwork={onEditNetwork}
        networkList={networkList}
      />
    </Grid>
  );
}
