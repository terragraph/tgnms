/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Box from '@material-ui/core/Box';
import CircularProgress from '@material-ui/core/CircularProgress';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {CUT_TYPE, METRIC_TYPE} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {ANPMetricContainer} from '@fbcnms/tg-nms/shared/dto/ANP';

export default function PlanKPIView({planId}: {planId: number}) {
  const [sections, setSections] = React.useState<Array<MetricSection>>([]);
  const loadMetricsTask = useTaskState();
  React.useEffect(() => {
    (async () => {
      try {
        loadMetricsTask.loading();
        const rawMetrics = await networkPlanningAPIUtil.getPlanMetrics({
          id: planId.toString(),
        });
        const formatted = formatMetrics(rawMetrics);
        setSections(formatted);
        loadMetricsTask.success();
      } catch (err) {
        console.error(err);
        loadMetricsTask.setMessage(err.message);
        loadMetricsTask.error();
      }
    })();
  }, [planId, loadMetricsTask]);
  return (
    <Grid
      container
      item
      direction="column"
      data-testid="plan-kpi-view"
      wrap="nowrap">
      {loadMetricsTask.isLoading && <CircularProgress size={16} />}
      {loadMetricsTask.isError && (
        <Typography variant="subtitle2" color="textSecondary">
          No metrics found. They may be out of retention.
        </Typography>
      )}
      {sections &&
        sections.map(({title, metrics}, idx) => (
          <React.Fragment key={title}>
            {idx > 0 && (
              <Box my={1} mx={-3}>
                <Divider />
              </Box>
            )}
            <Section title={title} metrics={metrics} />
          </React.Fragment>
        ))}
      <Box my={2} mx={-3}>
        <Divider />
      </Box>
    </Grid>
  );
}

type MetricSection = {
  title: string,
  metrics: Array<MetricItem>,
};
type MetricItem = {|
  label: string,
  value: ?string | ?number,
  unit?: string,
|};
function Section({title, metrics}: MetricSection) {
  return (
    <Grid container item xs={12} direction="column" spacing={1}>
      <Grid item>
        <Box mb={1}>
          <Typography variant="body1">{title}</Typography>
        </Box>
      </Grid>
      {metrics.map(({label, value, unit}) => (
        <Grid key={label} item container justifyContent="space-between">
          <Grid item>
            <Typography variant="body2">{label}</Typography>
          </Grid>
          <Grid item>
            <Typography align="right" variant="body2">
              {value} {unit}
            </Typography>
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * Convert metrics from flat array into tree structure
 */
function formatMetrics(metrics: Array<ANPMetricContainer>) {
  const tree = metricsToTree(metrics);
  const sections: Array<MetricSection> = [];

  const siteSections = [
    METRIC_TYPE.CN_SITES,
    METRIC_TYPE.DN_SITES,
    METRIC_TYPE.POP_SITES,
  ];
  for (const name of siteSections) {
    const section: MetricSection = {title: name, metrics: []};
    sections.push(section);
    section.metrics.push({
      label: 'Total',
      value: lookupMetric(tree, name, 'Status', 'Candidate'),
    });
    // Only CNs use the connectable status
    if (name == METRIC_TYPE.CN_SITES) {
      section.metrics.push({
        label: 'Connectable',
        value: lookupMetric(tree, name, 'Status', 'Connectable Candidate'),
      });
    }
    section.metrics.push({
      label: 'Active',
      value: lookupMetric(tree, name, 'Status', 'Active'),
    });
  }
  sections.push({
    title: 'Bandwidth',
    metrics: [
      {
        label: 'Min. guaranteed bandwidth',
        value: lookupMetric(
          tree,
          METRIC_TYPE.MINIMUM_GUARANTEED_BANDWIDTH,
          'Routing Type',
          'MCS-Based',
        )?.toFixed(2),
        unit: 'Gbps',
      },
      {
        label: 'Required bandwidth',
        value: lookupMetric(
          tree,
          METRIC_TYPE.TOTAL_BANDWIDTH_REQUIRED,
          CUT_TYPE.INCLUDE_OVERSUBSCRIPTION,
          'With Oversubscription',
        )?.toFixed(2),
        unit: 'Gbps',
      },
    ],
  });
  sections.push({
    title: '',
    metrics: [
      {
        label: 'Availability',
        value: lookupMetric(
          tree,
          METRIC_TYPE.AVAILABILITY,
          CUT_TYPE.PERCENTAGE_OF_DEMAND_LOCATIONS,
          '50',
        ),
      },
      {
        label: 'CapEx',
        value: lookupMetric(
          tree,
          METRIC_TYPE.CAPEX,
          CUT_TYPE.INCLUDE_EXISTING_NETWORK,
          'Without Existing Network',
        ),
      },
    ],
  });
  return sections;
}

type MetricTree = Map<string, Map<string, Map<string, number>>>;
/**
 * Convert the flat metrics array into a tree. The tree is grouped first by
 * metric_type, then cut_type. Finally, each cut_value maps to a certain value.
 *
 * For example:
 *
 * Cn Sites <- metric_type
 *  Status  <- cut_type
 *    Candidate: 10 <- {cut value: value}
 *    Active:  1
 */
function metricsToTree(metrics: Array<ANPMetricContainer>): MetricTree {
  const getOrDefault = <K, V>(map: Map<K, V>, key: K, defaultVal: V): V => {
    if (!map.has(key)) {
      map.set(key, defaultVal);
    }
    return map.get(key) ?? defaultVal;
  };

  const tree: MetricTree = new Map();
  for (const {metric, value} of metrics) {
    const type = metric.metric_type;
    const metric_type = getOrDefault(tree, type, new Map());
    const cut_type = getOrDefault(metric_type, metric.cut_type, new Map());
    cut_type.set(metric.cut_value, value.value);
  }
  return tree;
}

/**
 * Lookup a metric's value in the metric tree.
 *
 * For example:
 * lookupMetric(tree, METRIC_TYPE.CN_SITES, CUT_TYPE.STATUS, 'Candidate')
 */
function lookupMetric(
  tree: MetricTree,
  type: string,
  cut_type: string,
  cut_value: string,
): ?number {
  const cut_types = tree.get(type);
  if (cut_types == null) {
    return null;
  }
  const cut_values = cut_types.get(cut_type);
  if (cut_values == null) {
    return null;
  }
  const value = cut_values.get(cut_value);
  return value;
}
