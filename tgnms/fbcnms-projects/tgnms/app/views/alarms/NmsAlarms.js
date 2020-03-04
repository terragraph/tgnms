/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import Alarms from '@fbcnms/alarms/components/Alarms';
import EventAlertViewer from './eventalarms/EventAlertViewer';
import EventRuleEditor from './eventalarms/EventRuleEditor';
import {Severity as EventSeverity} from './eventalarms/EventAlarmsTypes';
import {SEVERITY as GenericSeverity} from '@fbcnms/alarms/components/severity/Severity';
import {PROMETHEUS_RULE_TYPE} from '@fbcnms/alarms/components/rules/PrometheusEditor/getRuleInterface';
import {SnackbarProvider} from 'notistack';
import {TgApiUtil, TgEventAlarmsApiUtil} from './TgAlarmApi.js';
import {makeStyles} from '@material-ui/styles';
import type {EventRule} from './eventalarms/EventAlarmsTypes';
import type {FiringAlarm, Labels} from '@fbcnms/alarms/components/AlarmAPIType';
import type {
  GenericRule,
  RuleInterface,
} from '@fbcnms/alarms/components/rules/RuleInterface';

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
const EVENT_RULE_TYPE = 'events';
export default function NmsAlarms(_props: Props) {
  const classes = useStyles();

  const ruleMap = React.useMemo<{[string]: RuleInterface<EventRule>}>(
    () => ({
      [EVENT_RULE_TYPE]: {
        friendlyName: 'Event',
        RuleEditor: EventRuleEditor,
        AlertViewer: EventAlertViewer,
        deleteRule: TgEventAlarmsApiUtil.deleteAlertRule,
        getRules: () =>
          TgEventAlarmsApiUtil.getRules().then(rules =>
            rules.map<GenericRule<EventRule>>(rule => ({
              severity: mapEventSeverityToGenericSeverity(rule.severity),
              name: rule.name,
              description: rule.description,
              period: `${rule.options.raiseDelay}s`,
              expression: ``,
              ruleType: EVENT_RULE_TYPE,
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
          getAlertType={getAlertType}
          filterLabels={filterLabels}
          thresholdEditorEnabled={false}
          alertManagerGlobalConfigEnabled={true}
          disabledTabs={['suppressions', 'routes']}
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

// inspect a firing alert and determine the rule type that generated it
function getAlertType(alert: FiringAlarm): string {
  const annotations = alert.annotations || {};
  if (typeof annotations['eventId'] && annotations['events']) {
    return EVENT_RULE_TYPE;
  }
  return PROMETHEUS_RULE_TYPE;
}

/**
 * Filters out hidden system labels from the firing alerts table
 */
function filterLabels(labels: Labels) {
  const labelsToFilter = ['networkID', 'tenant'];
  const filtered = {...labels};
  for (const label of labelsToFilter) {
    delete filtered[label];
  }
  return filtered;
}
