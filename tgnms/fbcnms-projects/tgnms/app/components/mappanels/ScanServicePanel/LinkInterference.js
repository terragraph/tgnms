/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import Grid from '@material-ui/core/Grid';
import ListItem from '@material-ui/core/ListItem';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import lightBlue from '@material-ui/core/colors/lightBlue';
import {HEALTH_CODES} from '../../../constants/HealthConstants';
import {LinkInterferenceColors} from '../../../constants/LayerConstants';
import {SCAN_INTERFERENCE_CUTOFFS} from './ScanInterference';
import {makeStyles} from '@material-ui/styles';
import {useRouteContext} from '../../../contexts/RouteContext';

import type {LinkInterferenceType} from '../../../../shared/dto/ScanServiceTypes';

const SELECTED_BLUE = lightBlue[50];

const useStyles = makeStyles(theme => ({
  overallInterference: {
    marginBottom: theme.spacing(1),
  },
  interferenceValue: {
    marginBottom: theme.spacing(1),
  },
  active: {
    backgroundColor: SELECTED_BLUE,
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(0.5),
    width: '100%',
  },
  direction: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(0.5),
  },
  listRoot: {padding: 0, margin: 0},
  arrow: {
    padding: theme.spacing(0.5),
  },
}));

type Props = {linkInterference?: LinkInterferenceType};

export default function LinkInterference(props: Props) {
  const {linkInterference} = props;
  const classes = useStyles();
  const routes = useRouteContext();
  const routesRef = React.useRef(routes);
  const [selectedDirection, setSelectedDirection] = React.useState(
    linkInterference?.directions[0],
  );

  const handleDirectionChange = React.useCallback(newDirection => {
    setSelectedDirection(newDirection);
  }, []);

  React.useEffect(() => {
    if (linkInterference) {
      const links =
        selectedDirection?.interference.reduce(
          (final, link) => {
            if (link.interferenceLinkName) {
              final[link.interferenceLinkName] = HEALTH_CODES.POOR;
            }
            return final;
          },
          {[linkInterference.assetName]: selectedDirection.health},
        ) ?? {};

      routesRef.current.onUpdateRoutes({
        node: null,
        links,
        nodes: new Set(),
      });
    }
  }, [routesRef, selectedDirection, linkInterference]);

  return linkInterference == null ||
    (linkInterference.totalINR &&
      linkInterference.totalINR < SCAN_INTERFERENCE_CUTOFFS.WEAK) ? (
    <Typography variant="h6">No Interference Detected</Typography>
  ) : (
    <Grid container direction="column">
      <Grid item>
        <Typography variant="body1">{linkInterference.assetName}</Typography>
      </Grid>

      {linkInterference.directions.map(direction => {
        const directionLabel = direction.label.split(',');
        return (
          <Grid item>
            <ListItem
              button
              dense
              key={direction.label}
              onClick={() => handleDirectionChange(direction)}
              className={classes.listRoot}
              selected={direction.label === selectedDirection?.label}>
              <div
                className={
                  direction.label === selectedDirection?.label
                    ? classes.active
                    : classes.direction
                }>
                <Grid
                  container
                  direction="row"
                  style={{color: LinkInterferenceColors[direction.health]}}>
                  <Typography variant="h6">{directionLabel[0]}</Typography>
                  <Typography variant="h6" className={classes.arrow}>
                    <ArrowForwardIcon fontSize="small" />
                  </Typography>
                  <Typography variant="h6">{directionLabel[1]}</Typography>
                </Grid>
                <div className={classes.overallInterference}>
                  <Typography variant="button">Overall Interference</Typography>
                </div>
                <div className={classes.interferenceValue}>
                  {direction.totalINR
                    ? `${direction.totalINR?.toFixed(2)} dB`
                    : 'Negligible total interference'}
                </div>
                <Typography variant="button">Top Interferers</Typography>
                {direction.interference
                  .filter(link => link.interferenceLinkName !== null)
                  .map(({interferenceLinkName, INR}) => (
                    <Typography>
                      {interferenceLinkName}: {INR.toFixed(2)} dB
                    </Typography>
                  ))}
              </div>
            </ListItem>
          </Grid>
        );
      })}
    </Grid>
  );
}
