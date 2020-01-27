/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MapOverlayLegend from './MapOverlayLegend';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Select from '@material-ui/core/Select';
import Slider from 'rc-slider';
import Typography from '@material-ui/core/Typography';
import {HistoricalLinkMetricsOverlayStrategy} from '../../views/map/overlays';
import {KeyboardDatePicker} from '@material-ui/pickers';
import {SiteOverlayColors} from '../../constants/LayerConstants';
import {createQuery, queryDataArray} from '../../apiutils/PrometheusAPIUtil';
import {withStyles} from '@material-ui/core/styles';

import type {Overlay} from '../../views/map/overlays';
import type {OverlayConfig} from '../../views/map/NetworkMapTypes';
import type {PrometheusDataType} from '../../apiutils/PrometheusAPIUtil';
import type {SiteToNodesMap} from '../../NetworkContext';

const NODE_ONLINE = 'node_online';
const STEP_SIZE = 60;
const MILLISECONDS_TO_MINUTES = 60000;
const MINUTES_IN_DAY = 1440;
const INTERVAL_SEC = 30;
const DATE_TO_STRING_PARAMS = [
  'en-US',
  {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  },
];

const styles = theme => ({
  formContainer: {
    flexDirection: 'column',
  },
  sectionPadding: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  select: {
    marginBottom: theme.spacing(1),
  },
  loadingIndicator: {
    marginLeft: theme.spacing(1),
    marginTop: -4,
  },
  formGroup: {
    marginBottom: theme.spacing(2),
  },
  centered: {
    textAlign: 'center',
  },
});

export type Props = {
  classes: {[string]: string},
  overlayConfig: ?OverlayConfig<any>,
  networkName: string,
  onUpdateMap: ({
    linkOverlayData: ?{[string]: {}},
    overlay: ?Overlay,
    siteOverlayData: ?{[string]: string},
  }) => any,
  expanded: boolean,
  onPanelChange: () => any,
  siteToNodesMap: SiteToNodesMap,
};

type State = {
  date: Date,
  isLoading: boolean,
  currentDate: Date,
  currentOverlay: string,
  currentData: ?{
    [string]: Array<PrometheusDataType>,
  },
  overlays: Array<Overlay>,
  errorMessage: ?string,
};

class MapHistoryOverlay extends React.Component<Props, State> {
  overlayStrategy = new HistoricalLinkMetricsOverlayStrategy();
  constructor(props) {
    super(props);
    const overlays = this.overlayStrategy.getOverlays();
    this.state = {
      date: new Date(new Date().toISOString().split('T')[0] + 'T08:00:00Z'),
      isLoading: true,
      currentDate: new Date(),
      currentOverlay: overlays[0].id,
      currentData: null,
      overlays: overlays,
      errorMessage: null,
    };
  }

  componentDidMount() {
    const {currentData} = this.state;
    if (currentData === null) {
      this.getData();
    }
  }

  handleDateChange(date) {
    if (date.toString() === 'Invalid Date') {
      return;
    }
    this.setState({date: new Date(date), isLoading: true}, () => {
      this.getData();
    });
  }

  getData() {
    const {networkName} = this.props;
    const {overlays} = this.state;

    const {date} = this.state;
    const start = Math.round(date.getTime() / 1000);
    const end = Math.round(start + MINUTES_IN_DAY * 60);
    const prometheusIds = [
      ...overlays.reduce((final, overlay) => {
        if (Array.isArray(overlay.metrics)) {
          overlay.metrics.forEach(metric => final.add(metric));
        }
        final.add(overlay.id);
        return final;
      }, new Set()),
    ];

    const queries = prometheusIds.map(prometheusId =>
      createQuery(prometheusId, {
        topologyName: networkName,
        intervalSec: INTERVAL_SEC,
      }),
    );
    queryDataArray(queries, start, end, STEP_SIZE, networkName)
      .then(resp => {
        this.setState({
          currentData: resp.data,
          isLoading: false,
          errorMessage: null,
        });
      })
      .catch(err => {
        this.setState({isLoading: false, errorMessage: err.message});
      });
  }

  findValuesByTimeStamp(data, timeStamp) {
    if (!data) {
      return null;
    }
    return data.reduce((final, [time, value]) => {
      if (time === timeStamp) {
        final = value;
      }
      return final;
    }, undefined);
  }

  formatLinkOverlayData(overlay: string = this.state.currentOverlay) {
    const {currentDate, currentData} = this.state;
    const timeStamp = currentDate.getTime() / 1000;

    if (!currentData || !currentData[overlay]) {
      return null;
    }

    return currentData[overlay].reduce((overlayData, data) => {
      const currentLinkName = data.metric.linkName || '';
      const currentLinkData = currentData[overlay].filter(
        element => element.metric.linkName === currentLinkName,
      );
      if (currentLinkData.length === 2) {
        const [aDirection, zDirection] = currentLinkData;
        overlayData[currentLinkName] = {
          A: {
            [overlay]: this.findValuesByTimeStamp(aDirection.values, timeStamp),
          },
          Z: {
            [overlay]: this.findValuesByTimeStamp(zDirection.values, timeStamp),
          },
        };
      } else {
        const val = this.findValuesByTimeStamp(data.values, timeStamp);
        overlayData[currentLinkName] = {
          A: {[overlay]: val},
          Z: {[overlay]: val},
        };
      }
      return overlayData;
    }, {});
  }

  formatSiteOverlayData() {
    const {siteToNodesMap} = this.props;
    const {currentData, currentDate} = this.state;
    const timeStamp = currentDate.getTime() / 1000;

    return Object.keys(siteToNodesMap).reduce((final, siteName) => {
      const siteNodes = [...siteToNodesMap[siteName]];
      const nodeData = currentData?.node_online;
      if (siteNodes.length === 0 || !nodeData) {
        final[siteName] = SiteOverlayColors.health.empty.color;
      } else {
        const siteAlive = new Set(
          siteNodes.map(nodeName =>
            this.findValuesByTimeStamp(
              nodeData.find(data => data.metric.nodeName === nodeName)?.values,
              timeStamp,
            ),
          ),
        );
        if (siteAlive.has('1') && !siteAlive.has('0') && !siteAlive.has(null)) {
          final[siteName] = SiteOverlayColors.health.healthy.color;
        } else if (
          siteAlive.has('1') &&
          (siteAlive.has('0') || siteAlive.has(null))
        ) {
          final[siteName] = SiteOverlayColors.health.partial.color;
        } else if (siteAlive.has('0')) {
          final[siteName] = SiteOverlayColors.health.unhealthy.color;
        } else {
          final[siteName] = SiteOverlayColors.health.empty.color;
        }
      }
      return final;
    }, {});
  }

  updateMap() {
    const {onUpdateMap} = this.props;
    const {currentOverlay} = this.state;

    const overlay = this.overlayStrategy.getOverlay(currentOverlay);
    let linkOverlayData;

    if (overlay && overlay.metrics) {
      linkOverlayData = overlay.metrics.reduce(
        (linkOverlayDataAggregator, metric) => {
          const metricData = this.formatLinkOverlayData(metric);
          if (metricData) {
            Object.keys(metricData).forEach(linkName => {
              if (linkOverlayDataAggregator[linkName] !== undefined) {
                linkOverlayDataAggregator[linkName]['A'][metric] =
                  metricData[linkName]['A'][metric];
                linkOverlayDataAggregator[linkName]['Z'][metric] =
                  metricData[linkName]['Z'][metric];
              } else {
                linkOverlayDataAggregator[linkName] = metricData[linkName];
              }
            });
          }
          return linkOverlayDataAggregator;
        },
        {},
      );
    } else {
      linkOverlayData = this.formatLinkOverlayData();
    }
    onUpdateMap({
      linkOverlayData,
      overlay,
      siteOverlayData: this.formatSiteOverlayData(),
    });
  }

  handleOverlaySelectionChange = () => event => {
    this.setState({currentOverlay: event.target.value}, () => {
      this.updateMap();
    });
  };

  onSliderChange = currentDate => {
    const {date} = this.state;
    this.setState(
      {
        currentDate: new Date(
          date.getTime() + currentDate * MILLISECONDS_TO_MINUTES,
        ),
      },
      () => {
        this.updateMap();
      },
    );
  };

  render() {
    const {classes, overlayConfig} = this.props;
    const {
      currentOverlay,
      currentDate,
      overlays,
      date,
      isLoading,
      errorMessage,
    } = this.state;

    return (
      <div className={classes.formContainer}>
        <div>
          <Typography variant="subtitle2">Selected Date</Typography>
          <KeyboardDatePicker
            disableToolbar
            inputVariant="outlined"
            format="MM/DD/YYYY"
            margin="dense"
            id="date"
            value={date.toISOString().split('T')[0]}
            onChange={ev => this.handleDateChange(ev._d)}
            KeyboardButtonProps={{
              'aria-label': 'change date',
            }}
          />
        </div>
        <div className={classes.sectionPadding} />
        {isLoading ? (
          <div data-testid="loadingCircle" className={classes.centered}>
            <CircularProgress />
          </div>
        ) : errorMessage ? (
          <Typography data-testid="errorMessage" variant="subtitle1">
            Error getting data: {errorMessage}
          </Typography>
        ) : (
          <>
            <FormLabel component="legend">
              <span>Current Value:</span>
            </FormLabel>
            <div>
              {currentDate.toLocaleDateString(...DATE_TO_STRING_PARAMS)}
            </div>
            <Slider
              value={Math.round(
                (currentDate.getTime() - date.getTime()) /
                  MILLISECONDS_TO_MINUTES,
              )}
              min={0}
              max={MINUTES_IN_DAY}
              step={1}
              onChange={this.onSliderChange}
            />
            <div className={classes.sectionPadding} />
            <FormGroup row={false} className={classes.formGroup}>
              <FormLabel component="legend">
                <span>Link Lines Overlay</span>
              </FormLabel>
              <Select
                value={currentOverlay}
                className={classes.select}
                onChange={this.handleOverlaySelectionChange()}>
                {overlays.map(overlay => {
                  if (overlay.id === NODE_ONLINE) {
                    return null;
                  }
                  return (
                    <MenuItem key={overlay.id} value={overlay.id}>
                      {overlay.name}
                    </MenuItem>
                  );
                })}
              </Select>
              <MapOverlayLegend
                overlay={this.overlayStrategy.getOverlay(currentOverlay)}
                layerOverlays={overlayConfig}
              />
            </FormGroup>
          </>
        )}
      </div>
    );
  }
}

export default withStyles(styles)(MapHistoryOverlay);
