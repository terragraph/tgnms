/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Alarms from '@fbcnms/alarms/components/Alarms';
import EventRuleEditor from './eventalarms/EventRuleEditor';
import {Severity as EventSeverity} from './eventalarms/EventAlarmsTypes';
import {SEVERITY as GenericSeverity} from '@fbcnms/alarms/components/Severity';
import {SnackbarProvider} from 'notistack';
import {TgApiUtil, TgEventAlarmsApiUtil} from './TgAlarmApi.js';
import {makeStyles} from '@material-ui/styles';
import type {EventRule} from './eventalarms/EventAlarmsTypes';
import type {
  GenericRule,
  RuleInterface,
} from '@fbcnms/alarms/components/RuleInterface';

const styles = () => ({
  root: {
    flex: '1 1 auto',
    flexFlow: 'column',
    display: 'flex',
    overflow: 'auto',
  },
});

type Props = {
  networkName: string,
};

const useStyles = makeStyles(styles);

export default function NmsAlarms(_props: Props) {
  const classes = useStyles();

  const ruleMap = React.useMemo<{[string]: RuleInterface<EventRule>}>(
    () => ({
      events: {
        friendlyName: 'Event',
        RuleEditor: EventRuleEditor,
        deleteRule: TgEventAlarmsApiUtil.deleteAlertRule,
        getRules: () =>
          TgEventAlarmsApiUtil.getRules().then(rules =>
            rules.map<GenericRule<EventRule>>(rule => ({
              severity: mapEventSeverityToGenericSeverity(rule.severity),
              name: rule.name,
              description: rule.description,
              period: `${rule.options.raiseDelay}s`,
              expression: ``,
              ruleType: 'events',
              rawRule: rule,
            })),
          ),
      },
    }),
    [],
  );
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
          ruleMap={ruleMap}
          makeTabLink={({match, keyName}) =>
            `/alarms/${match.params.networkName || ''}/${keyName}`
          }
          experimentalTabsEnabled={true}
          thresholdEditorEnabled={false}
        />
      </SnackbarProvider>
    </div>
  );
}

/**
 * Event rules use different severity names so we must map to the
 * standard severity names
 */
function mapEventSeverityToGenericSeverity(
  severity: $Keys<typeof EventSeverity>,
): $Keys<typeof GenericSeverity> {
  const mapping = {
    [EventSeverity.OFF]: GenericSeverity.NOTICE.name,
    [EventSeverity.INFO]: GenericSeverity.WARNING.name,
    [EventSeverity.MINOR]: GenericSeverity.MINOR.name,
    [EventSeverity.MAJOR]: GenericSeverity.MAJOR.name,
    [EventSeverity.CRITICAL]: GenericSeverity.CRITICAL.name,
  };
  const mapped = mapping[severity];
  if (typeof mapped !== 'string') {
    return GenericSeverity.WARNING.name;
  }
  return mapped;
}
