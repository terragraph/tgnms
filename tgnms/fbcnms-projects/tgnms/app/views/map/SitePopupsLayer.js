/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {Popup} from 'react-mapbox-gl';
import {withStyles} from '@material-ui/core/styles';

import type {TopologyType} from '../../../shared/types/Topology';

const styles = {};

type Props = {
  topology: TopologyType,
};

class SitePopupsLayer extends React.Component<Props> {
  render() {
    const {topology} = this.props;
    return topology.sites.map(site => (
      <Popup
        key={'popup-' + site.name}
        coordinates={[site.location.longitude, site.location.latitude]}>
        <div>{site.name}</div>
      </Popup>
    ));
  }
}

export default withStyles(styles)(SitePopupsLayer);
