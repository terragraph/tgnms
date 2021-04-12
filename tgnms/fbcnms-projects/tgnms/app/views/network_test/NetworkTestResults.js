/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import HealthGroupDropDown from '@fbcnms/tg-nms/app/components/common/HealthGroupDropDown';
import HealthHistogram from './HealthHistogram';
import Typography from '@material-ui/core/Typography';
import {EXECUTION_STATUS} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {
  HEALTH_DEFS,
  HEALTH_EXECUTIONS,
} from '@fbcnms/tg-nms/app/constants/HealthConstants';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {
  convertType,
  objectValuesTypesafe,
} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {
  getExecutionHealth,
  getExecutionStatus,
} from '@fbcnms/tg-nms/app/helpers/NetworkTestHelpers';
import {
  locToPos,
  locationMidpoint,
} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {AssetTestResultType} from './NetworkTestTypes';
import type {HealthRowType} from '@fbcnms/tg-nms/app/components/common/HealthGroupDropDown';

type Props = {|
  executionResults: Array<AssetTestResultType>,
  assetType: $Values<typeof TopologyElementType>,
|};

const useStyles = makeStyles(theme => ({
  header: {
    marginBottom: theme.spacing(2),
  },
  histogram: {
    width: '100%',
    height: 300,
    paddingTop: theme.spacing(1),
  },
}));

export default function NetworkTestResults(props: Props) {
  const classes = useStyles();
  const {executionResults, assetType} = props;
  const {setSelected, linkMap, nodeMap, siteMap} = useNetworkContext();
  const {moveMapTo} = useMapContext();

  const asset = assetType === TopologyElementType.LINK ? 'link' : 'site';

  const handleRowSelect = row => {
    const tempAssetName = row.asset_name;
    setSelected(assetType, tempAssetName);
    let location = {};
    if (assetType === TopologyElementType.LINK) {
      const tempLink = linkMap[tempAssetName];
      const aNode = nodeMap[tempLink.a_node_name];
      const zNode = nodeMap[tempLink.z_node_name];
      location = locationMidpoint(
        siteMap[aNode.site_name].location,
        siteMap[zNode.site_name].location,
      );
    } else {
      const tempNode = nodeMap[tempAssetName];
      location = siteMap[tempNode.site_name].location;
    }
    moveMapTo({
      center: locToPos(location),
    });
  };

  const {healthExecutions, statusCount} = React.useMemo(() => {
    const healthExecutions = HEALTH_EXECUTIONS.map(health => ({
      health,
      executions: [],
    }));

    const statusCount = objectValuesTypesafe<string>(EXECUTION_STATUS).reduce(
      (res, status) => {
        res[status] = 0;
        return res;
      },
      {},
    );

    executionResults.forEach(execution => {
      const status = getExecutionStatus(execution);
      statusCount[status] += 1;
      if (status === EXECUTION_STATUS.FINISHED) {
        const health = getExecutionHealth(execution);
        healthExecutions
          .find(healthExecution => healthExecution.health === health)
          ?.executions.push(execution);
      }
    });
    return {healthExecutions, statusCount};
  }, [executionResults]);

  const unsuccessfulTestCount =
    statusCount[EXECUTION_STATUS.FAILED] +
    statusCount[EXECUTION_STATUS.ABORTED];

  return (
    executionResults && (
      <>
        <HealthHistogram
          className={classes.histogram}
          healthExecutions={healthExecutions}
        />
        {statusCount[EXECUTION_STATUS.RUNNING] !== 0 ? (
          <Typography variant="body1">
            {`${statusCount[EXECUTION_STATUS.RUNNING]} ${asset}${getPlural(
              statusCount[EXECUTION_STATUS.RUNNING],
            )} currently being tested`}
          </Typography>
        ) : null}
        <Typography variant="body1">
          {`${statusCount[EXECUTION_STATUS.FINISHED]} ${asset}${getPlural(
            statusCount[EXECUTION_STATUS.FINISHED],
          )} successfully tested`}
        </Typography>
        <Typography variant="body1" className={classes.header}>
          {`${unsuccessfulTestCount} ${asset}${getPlural(
            unsuccessfulTestCount,
          )} unsuccessfully tested`}
        </Typography>

        {healthExecutions.map(assetHealth =>
          assetHealth.executions.length ? (
            <HealthGroupDropDown
              key={HEALTH_DEFS[assetHealth.health].name}
              executions={convertType<Array<HealthRowType>>(
                assetHealth.executions,
              )}
              onRowSelect={handleRowSelect}
              dropDownText={`${
                assetHealth.executions.length
              } ${asset}${getPlural(
                assetHealth.executions.length,
              )} with ${HEALTH_DEFS[
                assetHealth.health
              ].name.toLowerCase()} health`}
              health={assetHealth.health}
            />
          ) : null,
        )}
      </>
    )
  );
}

function getPlural(count) {
  if (count !== 1) {
    return 's';
  }
  return '';
}
