/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import CustomExpansionPanel from '../common/CustomExpansionPanel';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import PropTypes from 'prop-types';
import React from 'react';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import {formatNumber, toTitleCase} from '../../helpers/StringHelpers';
import {sortBy} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  sectionSpacer: {
    height: theme.spacing(1),
  },
});

// 'lastSeenTime' from now before declaring a WAP as dead
const WAP_LIVENESS_THRESHOLD_MS = 5 * 60 * 1000;

class AccessPointsPanel extends React.Component {
  state = {};

  renderAccessPointList(waps) {
    // Render the given list of access points
    return (
      <List component="nav">
        {waps.map(wap => {
          const clientText = `${formatNumber(wap.stats.clientCount)} ${
            wap.stats.clientCount === 1 ? 'client' : 'clients'
          }`;
          const lastSeen = moment(new Date(wap.stats.lastSeenTime)).fromNow();
          const wapOnline =
            new Date().getTime() - wap.stats.lastSeenTime <
            WAP_LIVENESS_THRESHOLD_MS;

          return (
            <ListItem
              key={wap.name}
              dense
              button={wap.hasSiteMatch}
              onClick={
                wap.hasSiteMatch
                  ? () => this.props.onSelectSite(wap.name)
                  : null
              }>
              <ListItemText
                primary={wap.name}
                primaryTypographyProps={{variant: 'subtitle2'}}
                secondary={
                  <span>
                    {clientText} &bull; <em>{lastSeen}</em>
                  </span>
                }
              />
              <ListItemSecondaryAction>
                <StatusIndicator
                  color={
                    wapOnline
                      ? StatusIndicatorColor.GREEN
                      : StatusIndicatorColor.RED
                  }
                />
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    );
  }

  renderAccessPoints() {
    // Render access points
    const {
      classes,
      topology,
      wirelessController,
      wirelessControllerStats,
    } = this.props;
    if (!wirelessController || !wirelessControllerStats) {
      return <Typography>No data received.</Typography>;
    }

    // Associate WAPs with sites (by name)
    const matchedSites = {}; // wapName => siteName
    topology.sites.forEach(site => {
      const wapName = site.name.toLowerCase();
      if (wirelessControllerStats.hasOwnProperty(wapName)) {
        matchedSites[wapName] = site.name;
      }
    });
    const matchedSitesCount = Object.keys(matchedSites).length;
    const waps = Object.entries(wirelessControllerStats).map(
      ([wapName, wapStats]) => {
        const siteName = matchedSites.hasOwnProperty(wapName)
          ? matchedSites[wapName]
          : null;
        return {
          name: siteName || wapName,
          stats: wapStats,
          hasSiteMatch: !!siteName,
        };
      },
    );
    sortBy(waps, [wap => wap.stats.clientCount]);

    const type = toTitleCase(wirelessController.type);
    return (
      <>
        {matchedSitesCount ? (
          <>
            <Typography variant="subtitle2">{type} AP Sites</Typography>
            {this.renderAccessPointList(waps.filter(wap => wap.hasSiteMatch))}

            {matchedSitesCount < waps.length ? (
              <>
                <Divider />
                <div className={classes.sectionSpacer} />
              </>
            ) : null}
          </>
        ) : null}

        {matchedSitesCount < waps.length ? (
          <>
            <Typography variant="subtitle2">Unmatched {type} APs</Typography>
            {this.renderAccessPointList(waps.filter(wap => !wap.hasSiteMatch))}
          </>
        ) : null}
      </>
    );
  }

  renderPanel() {
    return <div style={{width: '100%'}}>{this.renderAccessPoints()}</div>;
  }

  render() {
    const {expanded, onPanelChange, onClose} = this.props;

    return (
      <CustomExpansionPanel
        title="Access Points"
        details={this.renderPanel()}
        expanded={expanded}
        onChange={onPanelChange}
        onClose={onClose}
      />
    );
  }
}

AccessPointsPanel.propTypes = {
  classes: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectSite: PropTypes.func.isRequired,
  topology: PropTypes.object.isRequired,
  wirelessController: PropTypes.object,
  wirelessControllerStats: PropTypes.object,
};

export default withStyles(styles)(AccessPointsPanel);
