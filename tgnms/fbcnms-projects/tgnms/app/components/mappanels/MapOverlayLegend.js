/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import EditLegendButton from './EditLegendButton';
import Grid from '@material-ui/core/Grid';
import HealthIndicator from '../common/HealthIndicator';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import ReactDOM from 'react-dom';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import {MAP_CONTROL_LOCATIONS} from '../../constants/NetworkConstants';
import {METRIC_COLOR_RANGE} from '../../constants/LayerConstants';
import {SpecialNodeOverlayColors} from '../../constants/LayerConstants';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '../../contexts/MapContext';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(1.5),
  },
  title: {
    paddingLeft: theme.spacing(0.25),
    paddingTop: theme.spacing(0.25),
  },
  titleWrapper: {
    marginLeft: -theme.spacing(0.625),
  },
  resultDivider: {
    margin: `${theme.spacing()}px -${theme.spacing(1.5)}px`,
  },
  labelName: {
    marginTop: theme.spacing(0.75),
    textTransform: 'capitalize',
  },
  linkLabelName: {
    marginTop: theme.spacing(0.5),
    textTransform: 'capitalize',
  },
  siteLegendLabel: {
    margin: `-${theme.spacing(0.375)}px ${theme.spacing(2)}px`,
    marginLeft: 0,
  },
  linkLegendLabel: {
    margin: `-${theme.spacing(0.5)}px ${theme.spacing(2)}px`,
    marginLeft: 0,
  },
  linkHealthIndicator: {
    marginLeft: theme.spacing(),
    width: theme.spacing(0.5),
    height: theme.spacing(3),
  },
  siteHealthIndicator: {
    marginTop: theme.spacing(1.25),
    marginRight: theme.spacing(0.5),
    width: theme.spacing(1.5),
    height: theme.spacing(1.5),
  },
  rotateIcon: {
    transform: 'rotate(90deg)',
  },
  transition: {
    transition: 'all 0.3s',
  },
}));

export default function MapOverlayLegend() {
  const classes = useStyles();
  const {mapboxRef, overlaysConfig, selectedOverlays} = useMapContext();
  const [showLegend, setShowLegend] = React.useState(true);

  const mapboxControl = React.useMemo(() => {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    container.setAttribute('data-testid', 'tg-legend-container');
    return container;
  }, []);

  const editableLinkLegend = React.useMemo(
    () =>
      overlaysConfig.link_lines?.overlays.find(
        overlay =>
          overlay.id === selectedOverlays[overlaysConfig.link_lines.layerId],
      )?.range ?? null,
    [overlaysConfig, selectedOverlays],
  );

  const toggleLegend = React.useCallback(() => setShowLegend(curr => !curr), [
    setShowLegend,
  ]);

  React.useEffect(() => {
    mapboxRef?.addControl(
      {
        onAdd: _map => {
          return mapboxControl;
        },
        onRemove: () => {},
      },
      MAP_CONTROL_LOCATIONS.TOP_RIGHT,
    );
  }, [mapboxRef, mapboxControl]);

  const linkLegend = React.useMemo(
    () => getLegendsFromOverlay(overlaysConfig.link_lines, selectedOverlays),
    [overlaysConfig, selectedOverlays],
  );

  const nodeLegend = React.useMemo(
    () =>
      Object.keys(SpecialNodeOverlayColors).map(nodeType => ({
        elementColor: SpecialNodeOverlayColors[nodeType].color,
        labelName: `${nodeType} node`,
      })),
    [],
  );

  const siteLegend = React.useMemo(
    () => getLegendsFromOverlay(overlaysConfig.site_icons, selectedOverlays),
    [overlaysConfig, selectedOverlays],
  );

  return ReactDOM.createPortal(
    <Paper className={classes.root} elevation={2}>
      <Grid container className={classes.titleWrapper}>
        <IconButton
          size="small"
          onClick={toggleLegend}
          data-testid="drawer-toggle-button">
          <ChevronRightIcon
            color="secondary"
            className={classNames(
              showLegend ? classes.rotateIcon : '',
              classes.transition,
            )}
          />
        </IconButton>
        <Typography className={classes.title} variant="subtitle1">
          Legend
        </Typography>

        {editableLinkLegend && <EditLegendButton />}
      </Grid>

      <Collapse in={showLegend}>
        <Grid container direction="column">
          {linkLegend?.map(({labelName, elementColor}) => (
            <div className={classes.linkLegendLabel} key={labelName}>
              <Grid item container spacing={1} wrap="nowrap">
                <Grid item>
                  <HealthIndicator
                    color={elementColor}
                    className={classes.linkHealthIndicator}
                  />
                </Grid>
                <Grid item>
                  <Typography className={classes.linkLabelName} variant="body2">
                    {labelName +
                      (!(
                        labelName.includes('link') ||
                        labelName.includes('interference')
                      ) && !labelName.match(/\d+/g)
                        ? ' link'
                        : '')}
                  </Typography>
                </Grid>
              </Grid>
            </div>
          ))}
          <Divider className={classes.resultDivider} />
          {nodeLegend.map(({labelName, elementColor}) => (
            <div className={classes.siteLegendLabel} key={labelName}>
              <Grid item container spacing={1} wrap="nowrap">
                <Grid item>
                  <HealthIndicator
                    color={elementColor}
                    className={classes.siteHealthIndicator}
                  />
                </Grid>
                <Grid item>
                  <Typography className={classes.labelName} variant="body2">
                    {labelName}
                  </Typography>
                </Grid>
              </Grid>
            </div>
          ))}
          <Divider className={classes.resultDivider} />
          {siteLegend?.map(({labelName, elementColor}) => (
            <div className={classes.siteLegendLabel} key={labelName}>
              <Grid item container spacing={1} wrap="nowrap">
                <Grid item>
                  <HealthIndicator
                    color={elementColor}
                    className={classes.siteHealthIndicator}
                  />
                </Grid>
                <Grid item>
                  <Typography className={classes.labelName} variant="body2">
                    {labelName} site
                  </Typography>
                </Grid>
              </Grid>
            </div>
          ))}
        </Grid>
      </Collapse>
    </Paper>,
    mapboxControl,
  );
}

function getLegendsFromOverlay(overlayConfig, selectedOverlays) {
  if (!overlayConfig) {
    return;
  }

  const layerId = overlayConfig.layerId;
  const overlay = overlayConfig?.overlays.find(
    overlay => overlay.id === selectedOverlays[layerId],
  );

  const legend = overlayConfig.legend;

  if (!legend || !overlay) {
    return [];
  }
  const legendConfig = {
    ...(legend[overlay.overlayLegendType ?? overlay.type] ?? {}),
  };
  const {range, units = ''} = overlay;

  return Object.keys(legendConfig).map((element, idx) => {
    const elementColor = legendConfig[element].color;
    let labelName = element.replace('_', ' ');

    // Add range label
    if (
      range &&
      range.length === METRIC_COLOR_RANGE.length &&
      idx < range.length &&
      overlay.overlayLegendType !== 'ignition_status'
    ) {
      if (range[METRIC_COLOR_RANGE.length - 1] > range[0]) {
        labelName += ` (<= ${range[idx]}${units})`;
      } else {
        labelName += ` (>= ${range[idx]}${units})`;
      }
    }

    return {elementColor, labelName};
  });
}
