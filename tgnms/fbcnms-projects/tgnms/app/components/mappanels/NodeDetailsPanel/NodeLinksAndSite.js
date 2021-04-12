/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import React from 'react';
import StatusIndicator, {
  StatusIndicatorColor,
} from '../../common/StatusIndicator';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {getNodeLinks} from '@fbcnms/tg-nms/app/helpers/MapPanelHelpers';
import {makeStyles} from '@material-ui/styles';

import type {
  NodeType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';

const useStyles = makeStyles(theme => ({
  listItemIcon: {
    marginRight: theme.spacing(1),
    minWidth: 'unset',
  },
  sectionSpacer: {
    height: theme.spacing(1),
  },
  wrapped: {
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
}));

type Props = {
  node: NodeType,
  topology: TopologyType,
  onSelectLink: string => any,
  onSelectSite: string => any,
};

export default function NodeLinksAndSite(props: Props) {
  const classes = useStyles();
  const {node, topology, onSelectLink, onSelectSite} = props;
  const nodeLinks = getNodeLinks(
    node,
    topology.links,
    LinkTypeValueMap.WIRELESS,
  );

  return (
    <>
      <div className={classes.sectionSpacer} />
      <Divider />

      <List component="nav">
        {nodeLinks.map(link => (
          <ListItem
            button
            dense
            key={link.name}
            onClick={() => onSelectLink(link.name)}>
            <ListItemIcon classes={{root: classes.listItemIcon}}>
              <CompareArrowsIcon />
            </ListItemIcon>
            <ListItemText
              classes={{root: classes.wrapped}}
              primary={link.name}
              primaryTypographyProps={{variant: 'subtitle2'}}
              secondary={link.is_backup_cn_link ? 'Backup CN Link' : null}
            />
            <ListItemSecondaryAction>
              <StatusIndicator
                color={
                  link.is_alive
                    ? StatusIndicatorColor.GREEN
                    : StatusIndicatorColor.RED
                }
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        <ListItem button dense onClick={() => onSelectSite(node.site_name)}>
          <ListItemIcon classes={{root: classes.listItemIcon}}>
            <LocationOnIcon />
          </ListItemIcon>
          <ListItemText
            classes={{root: classes.wrapped}}
            primary={node.site_name}
            primaryTypographyProps={{variant: 'subtitle2'}}
          />
        </ListItem>
      </List>
    </>
  );
}
