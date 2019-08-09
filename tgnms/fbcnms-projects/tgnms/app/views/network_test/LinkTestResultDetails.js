/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {TestResult} from '../../../shared/dto/TestResult';

import * as React from 'react';

import * as StringHelpers from '../../helpers/StringHelpers';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import Grid from '@material-ui/core/Grid';
import HealthIndicator from './HealthIndicator';
import HelpTooltip from '../../components/common/HelpTooltip';
import Loading from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import {getHealthDef} from '../../constants/HealthConstants';
import {makeStyles} from '@material-ui/styles';
import {useLoadTestResults} from '../../hooks/NetworkTestHooks';

const MEGABITS = Math.pow(1000, 2);
//tests are run twice for each link, one for each direction
export type LinkTestResult = {|
  linkName: string,
  results: Array<TestResult>,
|};

const useLinkStyles = makeStyles(theme => ({
  link: {
    paddingTop: theme.spacing(2),
  },
  linkName: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  header: {
    marginBottom: theme.spacing(),
  },
  runTimeText: {
    textAlign: 'center',
  },
}));

function LinkTestResultDetails({
  testResultIds,
}: {
  testResultIds: Array<string>,
}) {
  const classes = useLinkStyles();
  const {loading, results} = useLoadTestResults({
    links: testResultIds,
  });
  if (loading || !results) {
    return <Loading />;
  }
  const [resultA, resultZ] = results;

  return (
    <Grid className={classes.link} container spacing={1}>
      <Grid
        className={classes.header}
        item
        container
        direction="column"
        justify="flex-start"
        xs={12}>
        <Grid item>
          <Typography
            variant="subtitle2"
            className={classes.runTimeText}
            title={`From ${resultA.start_date_utc.toLocaleString()} to ${resultA.end_date_utc.toLocaleString()}`}>
            Ran for:{' '}
            {StringHelpers.formatNumber(
              (resultA.end_date_utc - resultA.start_date_utc) / 1000,
              1,
            )}{' '}
            seconds
          </Typography>
        </Grid>
      </Grid>
      <Grid container item xs={12} className={classes.detailsContainer}>
        {resultA && (
          <Grid container item direction="column" justify="flex-start" xs={6}>
            <TestResultDetails result={resultA} />
          </Grid>
        )}
        {resultZ && (
          <Grid container item direction="column" justify="flex-start" xs={6}>
            <TestResultDetails result={resultZ} />
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}

const useDetailStyles = makeStyles(theme => ({
  linkNameWrapper: {
    width: '100%',
    marginBottom: theme.spacing(),
  },
  linkName: {
    textTransform: 'capitalize',
    fontWeight: 'bold',
    color: theme.palette.grey[600],
    overflow: 'hidden',
    textWrap: 'nowrap',
    textOverflow: 'ellipsis',
  },
  linkHealth: {
    marginBottom: theme.spacing(),
    textTransform: 'capitalize',
  },
  arrow: {
    transform: 'rotate(90deg)',
  },
}));

function TestResultDetails({result}: {|result: TestResult|}) {
  const classes = useDetailStyles();
  return (
    <>
      <Grid className={classes.linkHealth} item>
        <Typography variant="subtitle1" align="center">
          <HealthIndicator health={result.health} />{' '}
          {getHealthDef(result.health).name}
        </Typography>
      </Grid>

      <Grid className={classes.linkNameWrapper} item>
        <Typography className={classes.linkName} align="center" variant="body2">
          {result.origin_node}
        </Typography>
        <Typography className={classes.linkName} align="center" variant="body2">
          <ArrowForwardIcon className={classes.arrow} fontSize="small" />
        </Typography>
        <Typography className={classes.linkName} align="center" variant="body2">
          {result.peer_node}
        </Typography>
      </Grid>

      <MetricGroup
        header={'Summary Stats'}
        metrics={[
          [result.mcs_p90, 'mcs p90'],
          // this is reported by the receiver
          [result.snr_avg, 'snr avg'],
          [result.txpwr_avg, 'tx power'],
          [result.pathloss_avg, 'path loss'],
          [convertToExp(result.tx_per), 'PER'],
        ]}
      />

      <MetricGroup
        header={
          <>
            Peer Stats{' '}
            <HelpTooltip message="These stats are reported by the receiver" />
          </>
        }
        metrics={[
          [result.snr_avg, 'snr avg'],
          [result.snr_std, 'snr ±'],
          [result.rssi_avg, 'rssi avg'],
          [result.rssi_std, 'rssi ±'],
        ]}
      />

      <MetricGroup
        header="Ping Latency"
        unit="ms"
        metrics={[
          [result.ping_avg_latency, 'avg'],
          [result.ping_max_latency, 'max'],
          [result.ping_min_latency, 'min'],
        ]}
      />

      <MetricGroup
        header="iperf throughput"
        metrics={[
          [result.iperf_throughput_mean, 'avg'],
          [result.iperf_throughput_min, 'min'],
          [result.iperf_throughput_max, 'max'],
          [result.iperf_throughput_std, '±'],
        ]}
        format={x => StringHelpers.formatNumber(x / MEGABITS, 2)}
        unit="Mbps"
      />

      <MetricGroup
        header="iperf lost datagram"
        metrics={[
          [result.iperf_lost_datagram_mean, 'avg'],
          [result.iperf_lost_datagram_min, 'min'],
          [result.iperf_lost_datagram_max, 'max'],
          [result.iperf_lost_datagram_std, '±'],
        ]}
      />

      <MetricGroup
        header="iperf jitter"
        metrics={[
          [result.iperf_jitter_mean, 'avg'],
          [result.iperf_jitter_min, 'min'],
          [result.iperf_jitter_max, 'max'],
          [result.iperf_jitter_std, '±'],
        ]}
      />

      <MetricGroup header="MCS" metrics={[[result.mcs_p90, 'p90']]} />

      <MetricGroup
        header="Packets"
        metrics={[
          [result.num_tx_packets, 'tx'],
          [result.num_rx_packets, 'rx'],
          [convertToExp(result.tx_per), 'tx per'],
          [convertToExp(result.rx_per), 'rx per'],
          [result.tx_ba, 'tx ba'],
          [result.rx_ba, 'rx ba'],
        ]}
      />

      <MetricGroup
        header="Phys. Layer"
        metrics={[
          [result.tx_ppdu, 'tx ppdu'],
          [result.rx_ppdu, 'rx ppdu'],
          [result.rx_plcp_fail, 'rx plcp fail'],
        ]}
      />

      <MetricGroup
        header="Beam"
        metrics={[
          [result.rx_beam_idx, 'rx_idx'],
          [result.rx_rtcal_top_panel_beam, 'rx_rtcal_top_panel'],
          [result.rx_rtcal_bot_panel_beam, 'rx_rtcal_bot_panel'],
          [result.rx_vbs_beam, 'rx_vbs'],
          [result.rx_cbf_beam, 'rx_cbf'],
          [result.tx_beam_idx, 'tx_idx'],
          [result.tx_rtcal_top_panel_beam, 'tx_rtcal_top_panel'],
          [result.tx_rtcal_bot_panel_beam, 'tx_rtcal_bot_panel'],
          [result.tx_vbs_beam, 'tx_vbs'],
          [result.tx_cbf_beam, 'tx_cbf'],
        ]}
      />

      <MetricGroup
        header="Link"
        metrics={[
          [result.link_up_time, 'uptime'],
          [result.link_available_time, 'available time'],
          [result.num_link_up_flaps, 'link up flaps'],
          [result.num_link_avail_flaps, 'link avail flaps'],
          [result.p2mp_flag, 'p2mp'],
        ]}
      />

      <MetricGroup
        header="Ping"
        metrics={[
          [result.ping_loss, 'ping_loss'],
          [result.ping_pkt_rx, 'ping_pkt_rx'],
          [result.ping_pkt_tx, 'ping_pkt_tx'],
        ]}
      />

      <MetricGroup
        header="Link Error"
        metrics={[
          [result.iperf_link_error_min, 'min'],
          [result.iperf_link_error_max, 'max'],
          [result.iperf_link_error_mean, 'mean'],
          [result.iperf_link_error_std, 'std'],
        ]}
      />

      <MetricGroup
        header="Routing"
        metrics={[
          [result.is_ecmp, 'is ecmp'],
          [result.route_changed_count, 'route changes'],
        ]}
        format={x => StringHelpers.formatNumber(x, 0)}
      />
    </>
  );
}

const useMetricStyles = makeStyles(theme => ({
  metric: {
    marginBottom: theme.spacing(),
  },
  header: {
    width: '100%',
    textTransform: 'capitalize',
  },
  label: {
    paddingLeft: theme.spacing(),
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
}));

/**
 * Displays a group of related metrics with
 * common unit, value formatter, and a heading
 */
export function MetricGroup({
  header,
  metrics,
  unit = '',
  format,
}: {
  header: React.Node,
  metrics: Array<[number | string | boolean, string]>,
  unit?: string,
  format?: number => string,
}) {
  const classes = useMetricStyles();
  return (
    <>
      <Grid className={classes.metric} container item spacing={0}>
        <Typography
          className={classes.header}
          variant="subtitle2"
          align="center"
          gutterBottom>
          {header}
        </Typography>
        {metrics.map(([val, label]) => (
          <React.Fragment key={label}>
            <Grid item xs={6}>
              <Typography align="right" variant="body2">
                {renderVal(val, format)}
              </Typography>
            </Grid>
            <Grid align="left" item xs={6}>
              <Typography className={classes.label} variant="body2">
                {unit} ({label})
              </Typography>
            </Grid>
          </React.Fragment>
        ))}
      </Grid>
    </>
  );
}

type SingleMetricProps = {
  value: number | string,
  name: string,
  format?: number => string,
  label: string,
};

export function SingleMetric({name, value, format, label}: SingleMetricProps) {
  const classes = useMetricStyles();
  return (
    <Grid container item xs={12} align="center">
      <Grid xs={3} item align="left">
        <Typography variant="subtitle2">{name}</Typography>
      </Grid>
      <Grid xs={3} item>
        <Typography align="right" variant="body2">
          {renderVal(value, format)}
        </Typography>
      </Grid>
      <Grid xs={3} item className={classes.label} align="left">
        <Typography variant="body2">{label}</Typography>
      </Grid>
    </Grid>
  );
}

function renderVal(
  val: number | string | boolean,
  format: ?(number) => string,
) {
  if (typeof val === 'boolean') {
    return val.toString();
  }
  if (typeof val === 'string') {
    return val;
  }
  if (typeof val === 'number') {
    return format ? format(val) : StringHelpers.formatNumber(val, 2);
  }
  return 'N/A';
}

function convertToExp(val: number): string {
  if (typeof val === 'number') {
    return val.toExponential(1);
  }
  return 'N/A';
}

export default LinkTestResultDetails;
