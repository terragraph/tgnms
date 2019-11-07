/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Alarms from '@fbcnms/alarms/components/Alarms';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '../../NetworkContext';
import NetworkListContext from '../../NetworkListContext';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {AlarmServiceAPIUrls, TgApiUtil} from './TgAlarmApi.js';
import {EventIdValueMap} from '../../../shared/types/Event';
import {SnackbarProvider} from 'notistack';
import {objectEntriesTypesafe} from '../../helpers/ObjectHelpers';
import {withStyles} from '@material-ui/core/styles';

const styles = () => ({
  root: {
    flex: '1 1 auto',
    flexFlow: 'column',
    display: 'flex',
    overflow: 'auto',
  },
});

// Options for adding TG alarm service rules
const getTgAlarmServiceRuleOptions = (networkName, networkNameList) => ({
  events: {
    initialConfig: {
      name: '',
      description: '',
      eventId: 0,
      options: {
        raiseOnLevel: ['WARNING', 'ERROR', 'FATAL'],
        clearOnLevel: ['INFO'],
        eventFilter: [{topologyName: networkName}],
      },
      extraLabels: {team: 'operations'},
    },
    submitConfig: (match, alertConfig) => ({
      method: 'post',
      url: AlarmServiceAPIUrls.addAlarmRule(),
      data: alertConfig,
    }),
    transformPath: {
      eventId: ['eventId'],
      // TODO - figure out how to actually handle arrays here...
      topologyFilter: ['options', 'eventFilter', '0', 'topologyName'],
      entityFilter: ['options', 'eventFilter', '0', 'entity'],
      aggregation: ['options', 'aggregation'],
      name: ['name'],
      description: ['description'],
      severity: ['severity'],
      raiseDelay: ['options', 'raiseDelay'],
      team: ['extraLabels', 'team'],
    },
    transformValue: {
      aggregation: val => (val <= 0 ? null : val),
      raiseDelay: val => (val <= 0 ? null : val),
      severity: val => {
        const v = val.toUpperCase();
        return v === 'WARNING' ? 'MINOR' : v === 'NOTICE' ? 'INFO' : v;
      },
      topologyFilter: val => (val === '' ? null : val),
      entityFilter: val => (val === '' ? null : val),
    },
    renderConfigOptions: (updateAlertConfig, getValue) => (
      <>
        <Typography variant="subtitle1">Pick the triggering event</Typography>
        <TextField
          style={{marginBottom: 20}}
          select
          value={getValue('eventId')}
          onChange={event => updateAlertConfig('eventId', event.target.value)}>
          {objectEntriesTypesafe<string, number>(EventIdValueMap)
            .sort()
            .map(([eventId, val]) => (
              <MenuItem key={val} value={val}>
                {eventId}
              </MenuItem>
            ))}
        </TextField>
        <Typography variant="subtitle1">Filter by network</Typography>
        <TextField
          style={{marginBottom: 20}}
          select
          value={getValue('topologyFilter')}
          onChange={event =>
            updateAlertConfig('topologyFilter', event.target.value)
          }>
          {['', ...networkNameList].map(name => (
            <MenuItem key={name} value={name}>
              {name || <em>{'<any>'}</em>}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="subtitle1">Filter by entity</Typography>
        <TextField
          style={{marginBottom: 20}}
          placeholder="Ex: 00:11:22:33:44:ff"
          value={getValue('entityFilter')}
          onChange={event =>
            updateAlertConfig('entityFilter', event.target.value)
          }
        />
        <Typography variant="subtitle1">
          Minimum firing entities (optional)
        </Typography>
        <TextField
          type="number"
          value={getValue('aggregation')}
          onChange={event =>
            updateAlertConfig('aggregation', event.target.value)
          }
        />
      </>
    ),
  },
});

type Props = {
  classes: {[string]: string},
  networkName: string,
};

class NmsAlarms extends React.Component<Props> {
  // Return axios config to delete a TG alarm service rule
  deleteAlarmServiceRule = (match, rule) => {
    return {
      method: 'post',
      url: AlarmServiceAPIUrls.delAlarmRule(rule.rawData.name),
    };
  };

  // Pull in extra alarm rules from TG alarm service
  fetchAdditionalAlertRules = _lastRefreshTime => {
    return [];
  };

  render() {
    return (
      <NetworkListContext.Consumer>
        {listContext => (
          <NetworkContext.Consumer>
            {networkContext => this.renderContext(listContext, networkContext)}
          </NetworkContext.Consumer>
        )}
      </NetworkListContext.Consumer>
    );
  }

  renderContext = (listContext, _networkContext): React.Node => {
    const {classes, networkName} = this.props;
    return (
      <div className={classes.root}>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={10000}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}>
          <Alarms
            apiUtil={TgApiUtil}
            onFetchAdditionalAlertRules={this.fetchAdditionalAlertRules}
            onDeleteAdditionalAlertRule={this.deleteAlarmServiceRule}
            additionalAlertRuleOptions={getTgAlarmServiceRuleOptions(
              networkName,
              Object.keys(listContext.networkList),
            )}
            makeTabLink={({match, keyName}) =>
              `/alarms/${match.params.networkName || ''}/${keyName}`
            }
            experimentalTabsEnabled={true}
          />
        </SnackbarProvider>
      </div>
    );
  };
}

export default withStyles(styles)(NmsAlarms);
