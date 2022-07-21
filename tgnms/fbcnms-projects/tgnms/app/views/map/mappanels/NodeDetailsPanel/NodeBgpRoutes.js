/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';

import type {BgpRouteInfo} from '@fbcnms/tg-nms/shared/types/Controller';

const useStyles = makeStyles(() => ({
  bgpRouteListItem: {
    padding: '4px 0 2px 16px',
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
}));

type Props = {
  routes: Array<BgpRouteInfo>,
  title: string,
};

export default function NodeBgpRoutes(props: Props) {
  const classes = useStyles();
  const {routes, title} = props;

  return (
    <>
      <div className={classes.spaceBetween}>
        <Typography variant="body2">{title}</Typography>
        <Typography variant="body2">{formatNumber(routes.length)}</Typography>
      </div>
      <List dense disablePadding>
        {routes.map(({network, nextHop}) => (
          <ListItem key={network} classes={{root: classes.bgpRouteListItem}}>
            <ListItemText
              primary={network}
              primaryTypographyProps={{variant: 'subtitle2'}}
              secondary={'\u2192 ' + nextHop}
            />
          </ListItem>
        ))}
      </List>
    </>
  );
}
