/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import EditLegendButton from './EditLegendButton';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import ReactDOM from 'react-dom';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {METRIC_COLOR_RANGE} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {SpecialNodeOverlayColors} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

const useStyles = makeStyles(theme => ({
  root: {
    padding: `${theme.spacing()}px ${theme.spacing(1.5)}px`,
  },
  title: {
    paddingLeft: theme.spacing(1),
    paddingTop: theme.spacing(0.25),
  },
  titleWrapper: {
    marginLeft: -theme.spacing(0.25),
  },
  resultDivider: {
    margin: `${theme.spacing()}px ${theme.spacing(-1.5)}px`,
  },
  sectionName: {
    marginBottom: theme.spacing(1 / 2),
  },
  label: {
    '&::first-letter': {
      textTransform: 'capitalize',
    },
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
    () => getLegendsFromOverlay(overlaysConfig.nodes, selectedOverlays),
    [overlaysConfig, selectedOverlays],
  );

  const specialNodeLegend = React.useMemo(
    () =>
      Object.keys(SpecialNodeOverlayColors).map(nodeType => ({
        elementColor: SpecialNodeOverlayColors[nodeType].color,
        labelName: `${nodeType}`,
      })),
    [],
  );

  const siteLegend = React.useMemo(
    () => getLegendsFromOverlay(overlaysConfig.site_icons, selectedOverlays),
    [overlaysConfig, selectedOverlays],
  );

  return ReactDOM.createPortal(
    <Paper className={classes.root} elevation={2}>
      <Grid container direction="column">
        <Grid item className={classes.titleWrapper} container wrap="nowrap">
          <Grid item container xs={2} justify="center">
            <Grid item>
              <IconButton
                size="small"
                onClick={toggleLegend}
                data-testid="drawer-toggle-button"
                edge="start">
                <ChevronRightIcon
                  color="secondary"
                  className={classNames(
                    showLegend ? classes.rotateIcon : '',
                    classes.transition,
                  )}
                />
              </IconButton>
            </Grid>
          </Grid>
          <Grid item>
            <Typography className={classes.title} variant="subtitle1">
              Legend
            </Typography>
          </Grid>
        </Grid>
        <Collapse
          in={showLegend}
          component={Grid}
          container
          item
          direction="column"
          wrap="nowrap"
          justify="flex-start">
          <Grid
            container
            item
            direction="column"
            wrap="nowrap"
            justify="flex-start">
            <Grid
              item
              container
              justify="space-between"
              spacing={1}
              alignItems="center"
              wrap="nowrap">
              <Grid item>
                <SectionName>Links</SectionName>
              </Grid>
              <Grid item>{editableLinkLegend && <EditLegendButton />}</Grid>
            </Grid>
            {linkLegend?.map(({labelName, elementColor}) => (
              <LegendItem
                shape={LinkLegendShape}
                color={elementColor}
                label={labelName}
                key={labelName}
              />
            ))}
            <Divider className={classes.resultDivider} />
            <Grid item>
              <SectionName>Sites</SectionName>
            </Grid>
            {siteLegend?.map(({labelName, elementColor}) => (
              <LegendItem
                shape={SiteLegendShape}
                color={elementColor}
                label={labelName}
                key={labelName}
              />
            ))}
            {nodeLegend && nodeLegend.length > 0 && (
              <>
                <Divider className={classes.resultDivider} />
                <Grid item>
                  <SectionName>Nodes</SectionName>
                </Grid>
                {nodeLegend.map(({labelName, elementColor}) => (
                  <LegendItem
                    shape={SiteLegendShape}
                    color={elementColor}
                    label={labelName}
                    key={labelName}
                  />
                ))}
              </>
            )}
            <Divider className={classes.resultDivider} />
            {specialNodeLegend.map(({labelName, elementColor}) => (
              <LegendItem
                shape={SiteLegendShape}
                color={elementColor}
                label={labelName}
                key={labelName}
              />
            ))}
          </Grid>
        </Collapse>
      </Grid>
    </Paper>,
    mapboxControl,
  );
}

const OPERATORS = {
  LEQ: '≤',
  GEQ: '≥',
};
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
  //TODO: this needs to change
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
        labelName += ` (${OPERATORS.LEQ} ${range[idx]}${units})`;
      } else {
        labelName += ` (${OPERATORS.GEQ} ${range[idx]}${units})`;
      }
    }

    return {elementColor, labelName};
  });
}

function SectionName({children}) {
  const classes = useStyles();
  return (
    <Typography className={classes.sectionName} variant="body2">
      {children}
    </Typography>
  );
}

function LegendItem({
  shape: Shape,
  color,
  label,
}: {
  shape: React.ComponentType<LegendShapeProps>,
  color: string,
  label: string,
}) {
  const classes = useStyles();
  return (
    <Grid item container wrap="nowrap" spacing={1}>
      <Grid item>
        <Shape color={color} />
      </Grid>
      <Grid item>
        <Typography
          variant="caption"
          className={classes.label}
          // component must be a paragraph for ::first-element selector to work
          component="p">
          {label}
        </Typography>
      </Grid>
    </Grid>
  );
}

type LegendShapeProps = {|
  className?: string,
  color: string,
|};

const useLegendShapeStyles = makeStyles(_theme => ({
  line: {
    height: 12,
    width: 4,
    display: 'inline-block',
    backgroundColor: ({color}: {color: string}) => color,
    borderRadius: 1.5,
    verticalAlign: 'middle',
  },
  circle: {
    borderRadius: '50%',
    display: 'inline-block',
    height: '8px',
    verticalAlign: 'middle',
    width: '8px',
    backgroundColor: ({color}: {color: string}) => color,
  },
}));

function LinkLegendShape(props: LegendShapeProps) {
  const {className} = props;
  const classes = useLegendShapeStyles(props);
  return <span className={classNames(classes.line, className)} />;
}

function SiteLegendShape(props: LegendShapeProps) {
  const {className} = props;
  const classes = useLegendShapeStyles(props);
  return <span className={classNames(classes.circle, className)} />;
}
