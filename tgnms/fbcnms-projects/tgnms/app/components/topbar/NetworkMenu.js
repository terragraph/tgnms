/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import Button from '@material-ui/core/Button';
import ListSubheader from '@material-ui/core/ListSubheader';
import MUINavLink from '@fbcnms/tg-nms/app/components/topbar/MUINavLink';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {makeStyles} from '@material-ui/styles';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useNetworkListContext} from '@fbcnms/tg-nms/app/contexts/NetworkListContext';

import type {NetworkInstanceConfig} from '@fbcnms/tg-nms/shared/dto/NetworkState';

const useStyles = makeStyles(theme => ({
  networkMenuButton: {
    marginRight: theme.spacing(),
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.common.white,
    borderColor: '#E5E5E5',
  },
  active: {
    backgroundColor: theme.palette.grey[300],
  },
}));

export default function NetworkMenu() {
  const {
    changeNetworkName,
    networkList,
    getNetworkName,
  } = useNetworkListContext();
  const networkName = getNetworkName();
  const classes = useStyles();

  const [networksMenuAnchor, setNetworksMenuAnchor] = React.useState();

  const openNetworksMenu = React.useCallback(
    e => setNetworksMenuAnchor(e.currentTarget),
    [setNetworksMenuAnchor],
  );

  const closeNetworksMenu = React.useCallback(
    () => setNetworksMenuAnchor(null),
    [setNetworksMenuAnchor],
  );

  // Render the network selection menu
  const activeNetwork =
    networkName && networkList && networkList.hasOwnProperty(networkName)
      ? networkList[networkName]
      : null;

  return (
    <div>
      <Button
        variant="outlined"
        aria-owns={networksMenuAnchor ? 'networks-appbar' : null}
        aria-haspopup="true"
        className={`${classes.networkMenuButton} ${STEP_TARGET.NETWORK_NAME}`}
        onClick={openNetworksMenu}
        data-testid="toggle-networks-menu"
        color="inherit">
        {networkName !== null && activeNetwork ? (
          <StatusIndicator
            color={
              activeNetwork.controller_online
                ? StatusIndicatorColor.GREEN
                : StatusIndicatorColor.RED
            }
          />
        ) : null}
        {networkName !== null ? networkName : 'Not Selected'}
        <ArrowDropDownIcon />
      </Button>
      <Menu
        id="networks-appbar"
        anchorEl={networksMenuAnchor}
        anchorOrigin={{vertical: 'top', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
        MenuListProps={{
          subheader: (
            <ListSubheader component="div">
              <strong>Network</strong>
            </ListSubheader>
          ),
        }}
        open={!!networksMenuAnchor}
        onClose={closeNetworksMenu}>
        {networkList !== null && Object.keys(networkList).length > 0 ? (
          objectEntriesTypesafe<string, NetworkInstanceConfig>(networkList).map(
            ([networkName, network]) => (
              <MenuItem
                key={networkName}
                component={MUINavLink}
                value={networkName}
                to={changeNetworkName(networkName)}
                activeClassName={classes.active}
                disabled={!network.controller_online}>
                <StatusIndicator
                  color={
                    network.controller_online
                      ? StatusIndicatorColor.GREEN
                      : StatusIndicatorColor.RED
                  }
                />
                {networkName}
              </MenuItem>
            ),
          )
        ) : (
          <MenuItem disabled>No networks defined.</MenuItem>
        )}
      </Menu>
    </div>
  );
}
