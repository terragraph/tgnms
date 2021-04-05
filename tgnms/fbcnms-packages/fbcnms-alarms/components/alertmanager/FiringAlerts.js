/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import AddAlertTwoToneIcon from '@material-ui/icons/AddAlertTwoTone';
import AlertDetailsPane from './AlertDetails/AlertDetailsPane';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import SimpleTable from '../table/SimpleTable';
import Slide from '@material-ui/core/Slide';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import {Link} from 'react-router-dom';
import {SEVERITY} from '../severity/Severity';
import {get} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {useAlarmContext} from '../AlarmContext';
import {useEffect, useState} from 'react';
import {useNetworkId} from '../../components/hooks';
import {useSnackbars} from '../../hooks/useSnackbar';

import type {FiringAlarm} from '../AlarmAPIType';

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(4),
  },
  loading: {
    display: 'flex',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAlertIcon: {
    fontSize: '200px',
    margin: theme.spacing(1),
  },
  helperText: {
    color: theme.palette.text.primary,
    fontSize: theme.typography.pxToRem(20),
  },
}));

export default function FiringAlerts() {
  const {apiUtil, filterLabels} = useAlarmContext();
  const [selectedRow, setSelectedRow] = useState<?FiringAlarm>(null);
  const [lastRefreshTime, _setLastRefreshTime] = useState<string>(
    new Date().toLocaleString(),
  );
  const [alertData, setAlertData] = useState<?Array<FiringAlarm>>(null);
  const classes = useStyles();
  const snackbars = useSnackbars();
  const networkId = useNetworkId();
  const {error, isLoading, response} = apiUtil.useAlarmsApi(
    apiUtil.viewFiringAlerts,
    {networkId},
    lastRefreshTime,
  );

  useEffect(() => {
    if (!isLoading) {
      const alertData = response
        ? response.map(alert => {
            let labels = alert.labels;
            if (labels && filterLabels) {
              labels = filterLabels(labels);
            }
            return {
              ...alert,
              labels,
            };
          })
        : [];
      setAlertData(alertData);
    }
    return () => {
      setAlertData(null);
    };
  }, [filterLabels, isLoading, response, setAlertData]);

  const showRowDetailsPane = React.useCallback(
    (row: FiringAlarm) => {
      setSelectedRow(row);
    },
    [setSelectedRow],
  );
  const hideDetailsPane = React.useCallback(() => {
    setSelectedRow(null);
  }, [setSelectedRow]);

  React.useEffect(() => {
    if (error) {
      snackbars.error(
        `Unable to load firing alerts. ${
          error.response ? error.response.data.message : error.message || ''
        }`,
      );
    }
  }, [error, snackbars]);

  if (!isLoading && alertData?.length === 0) {
    return (
      <Grid
        container
        spacing={2}
        direction="column"
        alignItems="center"
        justify="center"
        data-testid="no-alerts-icon"
        style={{minHeight: '60vh'}}>
        <Grid item>
          <AddAlertTwoToneIcon
            color="primary"
            className={classes.addAlertIcon}
          />
        </Grid>
        <Grid item>
          <span className={classes.helperText}>Start creating alert rules</span>
        </Grid>
        <Grid item>
          <Button
            color="primary"
            size="small"
            variant="contained"
            component={Link}
            to={`/alarms/${networkId || ''}/rules`}>
            Add Alert Rule
          </Button>
        </Grid>
      </Grid>
    );
  }
  return (
    <Grid className={classes.root} container spacing={2}>
      <Grid item xs={selectedRow ? 8 : 12}>
        <SimpleTable
          onRowClick={showRowDetailsPane}
          columnStruct={[
            {
              title: 'name',
              getValue: x => x.labels?.alertname,
              renderFunc: data => {
                const entity =
                  data.labels.entity || data.labels.nodeMac || null;
                return (
                  <>
                    <Typography variant="body1">
                      {data.labels?.alertname}
                    </Typography>
                    {entity && (
                      <Typography variant="body2">{entity}</Typography>
                    )}
                  </>
                );
              },
            },
            {
              title: 'severity',
              getValue: x => x.labels?.severity,
              render: 'severity',
            },
            {
              title: 'date',
              getValue: x => x.startsAt,
              renderFunc: (data, classes) => {
                const date = moment(new Date(data.startsAt));
                return (
                  <>
                    <Typography variant="body1">{date.fromNow()}</Typography>

                    <div className={classes.secondaryItalicCell}>
                      {date.format('dddd, MMMM Do YYYY')}
                    </div>
                  </>
                );
              },
            },
          ]}
          tableData={alertData || []}
          sortFunc={alert =>
            get(
              SEVERITY,
              [get(alert, ['labels', 'severity']).toLowerCase(), 'index'],
              undefined,
            )
          }
          data-testid="firing-alerts"
        />
        {isLoading && (
          <div className={classes.loading}>
            <CircularProgress />
          </div>
        )}
      </Grid>
      <Slide direction="left" in={!!selectedRow}>
        <Grid item xs={4}>
          {selectedRow && (
            <AlertDetailsPane alert={selectedRow} onClose={hideDetailsPane} />
          )}
        </Grid>
      </Slide>
    </Grid>
  );
}
