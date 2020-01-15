/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import AddLocationIcon from '@material-ui/icons/AddLocation';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import EditIcon from '@material-ui/icons/Edit';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NearMeIcon from '@material-ui/icons/NearMe';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import TimelineIcon from '@material-ui/icons/Timeline';
import {apiServiceRequestWithConfirmation} from '../apiutils/ServiceAPIUtil';

/** Creates a menu with the given action items. */
export function createActionsMenu(options, state, setState) {
  const {actionItems, buttonClassName} = options;
  return (
    <>
      <List component="nav">
        <ListItem
          className={buttonClassName || null}
          button
          dense
          aria-haspopup={true}
          onClick={ev => setState({actionsAnchorEl: ev.currentTarget})}>
          <ListItemText
            primary={'View Actions\u2026'}
            primaryTypographyProps={{variant: 'button'}}
          />
        </ListItem>
      </List>
      <Menu
        anchorEl={state.actionsAnchorEl}
        open={Boolean(state.actionsAnchorEl)}
        onClose={() => setState({actionsAnchorEl: null})}
        disableAutoFocusItem>
        {actionItems.map(({heading, actions}) => [
          <ListSubheader
            key={heading}
            component="div"
            style={{lineHeight: '2rem', outline: 'none'}}>
            {heading}
          </ListSubheader>,
          ...actions.map(({label, icon, func, component}) => {
            return (
              <MenuItem
                key={label}
                onClick={() => {
                  setState({actionsAnchorEl: null});
                  if (func) {
                    func();
                  }
                }}
                {...(component ? {component} : {})}>
                {icon && <ListItemIcon>{icon}</ListItemIcon>}
                <ListItemText primary={label} />
              </MenuItem>
            );
          }),
        ])}
      </Menu>
    </>
  );
}

export function getNodeLinks(
  node: NodeType,
  links: Array<LinkType>,
  linkType: $Values<typeof LinkTypeValueMap>,
) {
  // Find all wireless links associated with this node
  return links.filter(
    link =>
      link.link_type === linkType &&
      (link.a_node_name === node.name || link.z_node_name === node.name),
  );
}

/** Make a topology builder request (with confirmation and response alerts). */
export function sendTopologyBuilderRequest(
  networkName,
  endpoint,
  data,
  typeStr,
  options,
) {
  apiServiceRequestWithConfirmation(networkName, endpoint, data, {
    ...options,
    desc: 'You are adding a ' + typeStr + ' to this topology.',
    getSuccessStr: _msg => 'The ' + typeStr + ' was added sucessfully.',
    successType: 'text',
    getFailureStr: msg =>
      `The ${typeStr} could not be added.<p><tt>${msg}</tt></p>`,
    failureType: 'html',
  });
}

/** Make a topology edit request (with confirmation and response alerts). */
export function sendTopologyEditRequest(
  networkName,
  endpoint,
  data,
  typeStr,
  options,
) {
  apiServiceRequestWithConfirmation(networkName, endpoint, data, {
    ...options,
    desc: 'You are making changes to a ' + typeStr + ' in this topology.',
    getSuccessStr: _msg =>
      'The changes to this ' + typeStr + ' were saved sucessfully.',
    successType: 'text',
    getFailureStr: msg =>
      `The ${typeStr} could not be saved.<p><tt>${msg}</tt></p>`,
    failureType: 'html',
  });
}

/** Return the icon representing a node. */
export function getNodeIcon(props = {}) {
  return <RouterIcon {...props} />;
}

/** Return the icon representing a link. */
export function getLinkIcon(props = {}) {
  return <CompareArrowsIcon {...props} />;
}

/** Return the icon representing a site. */
export function getSiteIcon(props = {}) {
  return <LocationOnIcon {...props} />;
}

/** Return the icon representing a new site. */
export function getAddSiteIcon(props = {}) {
  return <AddLocationIcon {...props} />;
}

/** Returns the icon representing the "Edit" feature. */
export function getEditIcon(props = {}) {
  return <EditIcon {...props} />;
}

/** Return the icon representing the "Search Nearby" feature. */
export function getSearchNearbyIcon(props = {}) {
  return <NearMeIcon {...props} />;
}

/** Return the icon representing the "Show Routes" feature. */
export function getShowRoutesIcon(props = {}) {
  return <TimelineIcon {...props} />;
}
