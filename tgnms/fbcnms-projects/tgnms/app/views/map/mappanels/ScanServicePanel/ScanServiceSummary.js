/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '@fbcnms/tg-nms/app/components/common/LoadingBox';
import NmsOptionsContext from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import React from 'react';
import ScanConnectivity from './ScanConnectivity';
import ScanInterference from './ScanInterference';
import ScanPanelTitle from './ScanPanelTitle';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import {useLoadScanExecutionResults} from '@fbcnms/tg-nms/app/hooks/ScanServiceHooks';

type Props = {
  scanId: string,
};

const scanModes = {
  INTERFERENCE: 'INTERFERENCE',
  CONNECTIVITY: 'CONNECTIVITY',
  SUMMARY: 'SUMMARY',
};

const useSummaryStyles = makeStyles(theme => ({
  header: {
    textTransform: 'uppercase',
    marginBottom: theme.spacing(1),
  },
  resultDivider: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  scanTitle: {
    fontStyle: 'italic',
  },
  description: {textTransform: 'none'},
}));

export default function ScanServiceSummary(props: Props) {
  const {scanId} = props;
  const classes = useSummaryStyles();
  const {
    loading,
    execution,
    results,
    aggregatedInr,
  } = useLoadScanExecutionResults({scanId});
  const [scanMode, setScanMode] = React.useState(scanModes.SUMMARY);
  const {updateNetworkMapOptions} = React.useContext(NmsOptionsContext);

  const handleBack = React.useCallback(() => {
    setScanMode(scanModes.SUMMARY);
    updateNetworkMapOptions({
      temporaryTopology: null,
      temporarySelectedAsset: null,
      scanLinkData: null,
    });
  }, [updateNetworkMapOptions]);

  if (loading || !execution || !results) {
    return <LoadingBox fullScreen={false} />;
  }

  const startDate = new Date(execution.start_dt);

  return (
    <Grid container direction="column">
      {scanMode === scanModes.SUMMARY && (
        <Grid item container>
          <ScanPanelTitle startDate={startDate} />
          <Divider className={classes.resultDivider} />
          <Button onClick={() => setScanMode(scanModes.CONNECTIVITY)}>
            <Grid item container>
              <Grid item xs={12}>
                <Typography align="left" variant="subtitle2">
                  Connectivity
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="body2"
                  align="left"
                  className={classes.description}>
                  A connectivity result finds hidden links that can be added to
                  your topology as backuplinks or can replace current links.
                </Typography>
              </Grid>
            </Grid>
          </Button>
          <Divider className={classes.resultDivider} />
          <Button onClick={() => setScanMode(scanModes.INTERFERENCE)}>
            <Grid item container>
              <Grid item xs={12}>
                <Typography align="left" variant="subtitle2">
                  Interference
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="body2"
                  align="left"
                  className={classes.description}>
                  An interference result allows you to see which links are
                  causing a degredation of the network due to interference.
                </Typography>
              </Grid>
            </Grid>
          </Button>
        </Grid>
      )}
      {scanMode === scanModes.CONNECTIVITY && (
        <ScanConnectivity
          onBack={handleBack}
          results={results}
          startDate={startDate}
        />
      )}
      {scanMode === scanModes.INTERFERENCE && (
        <ScanInterference
          onBack={handleBack}
          results={results}
          aggregatedInr={aggregatedInr}
          startDate={startDate}
        />
      )}
    </Grid>
  );
}
