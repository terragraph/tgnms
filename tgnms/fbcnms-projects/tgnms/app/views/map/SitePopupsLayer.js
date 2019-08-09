/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import PropTypes from 'prop-types';
import React from 'react';
import {Popup} from 'react-mapbox-gl';
import {withStyles} from '@material-ui/core/styles';

const styles = {};

class SitePopupsLayer extends React.Component {
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

SitePopupsLayer.propTypes = {
  topology: PropTypes.object.isRequired,
};

export default withStyles(styles)(SitePopupsLayer);
