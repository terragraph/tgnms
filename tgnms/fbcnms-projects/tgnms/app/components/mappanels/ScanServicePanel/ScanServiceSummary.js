/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '../../common/LoadingBox';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import React from 'react';
import ScanConnectivity from './ScanConnectivity';
import ScanInterference from './ScanInterference';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import {useLoadScanExecutionResults} from '../../../hooks/ScanServiceHooks';

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
  const {loading, execution, results} = useLoadScanExecutionResults({scanId});
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
      <Typography className={classes.header} variant="subtitle1">
        results from
        {startDate.toLocaleString('default', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </Typography>
      <Typography className={classes.scanTitle} variant="body1" gutterBottom>
        IM Scan Result
      </Typography>
      <Divider className={classes.resultDivider} />
      {scanMode === scanModes.SUMMARY && (
        <Grid item container>
          <Button onClick={() => setScanMode(scanModes.CONNECTIVITY)}>
            <Grid item container>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Connectivity</Typography>
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
                <Typography variant="subtitle2">Interference</Typography>
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
        <ScanConnectivity onBack={handleBack} results={results} />
      )}
      {scanMode === scanModes.INTERFERENCE && (
        <ScanInterference onBack={handleBack} results={results} />
      )}
    </Grid>
  );
}