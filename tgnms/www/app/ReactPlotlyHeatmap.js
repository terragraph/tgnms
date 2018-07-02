/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import React from 'react';

const OldNewBeam = {
  oldRx: 0,
  oldTx: 1,
  newRx: 2,
  newTx: 3,
};

const NO_NEW_BEAM = 255;

const RenderHeatmap = ({
  zData,
  txData,
  rxData,
  heightWidth,
  heatmaptitle,
  oldNewBeams,
}) => {
  // create a 2-D array of the same dimensions as zmap so that
  // it will say "SNR" when you hover over the heatmap
  const createSnrText = () => {
    const arr = [];
    for (let i = 0; i < zData.length; i++) {
      if (zData[i]) {
        arr[i] = zData[i].map(x => 'SNR');
      }
    }
    return arr;
  };

  const annotations = () => {
    // oldNewBeams is in the format [oldRx, oldTx, newRx, newTx]

    if (
      oldNewBeams[OldNewBeam.oldTx] === NO_NEW_BEAM ||
      oldNewBeams[OldNewBeam.oldRx] === NO_NEW_BEAM
    ) {
      return null;
    }
    const results = [];
    let result = {
      xref: 'x1',
      yref: 'y1',
      x: oldNewBeams[OldNewBeam.newTx],
      y: oldNewBeams[OldNewBeam.newRx],
      text: 'O',
      showarrow: false,
    };
    results.push(result);
    if (
      oldNewBeams[OldNewBeam.oldRx] !== oldNewBeams[OldNewBeam.newRx] ||
      oldNewBeams[OldNewBeam.oldTx] !== oldNewBeams[OldNewBeam.newTx]
    ) {
      result = {
        xref: 'x1',
        yref: 'y1',
        x: oldNewBeams[OldNewBeam.oldTx],
        y: oldNewBeams[OldNewBeam.oldRx],
        text: 'X',
        showarrow: false,
      };
      results.push(result);
    }
    return results;
  };

  return (
    <Plot
      data={[
        {
          type: 'heatmap',
          x: txData,
          y: rxData,
          z: zData,
          zmin: -5,
          colorscale: 'YIGnBu',
          text: createSnrText(),
          hoverinfo: 'x+y+z+text',
          zmax: 22,
        },
      ]}
      config={{
        // displayModeBar: false,
        displaylogo: false,
        modeBarButtonsToRemove: [
          'sendDataToCloud',
          'hoverClosestCartesian',
          'hoverCompareCartesian',
          'toggleSpikelines',
          'autoScale2d',
        ],
      }}
      layout={{
        width: heightWidth,
        height: heightWidth,
        title: heatmaptitle.title,
        xaxis: {title: heatmaptitle.xaxis},
        yaxis: {title: heatmaptitle.yaxis},
        annotations: annotations(),
      }}
    />
  );
};

const Render2Dplot = ({yData, xData, heightWidth, plotTitle}) => {
  return (
    <Plot
      data={[
        {
          mode: 'lines+markers',
          type: 'scatter',
          x: xData,
          y: yData,
        },
      ]}
      config={{
        // displayModeBar: false,
        displaylogo: false,
        modeBarButtonsToRemove: [
          'sendDataToCloud',
          'hoverClosestCartesian',
          'hoverCompareCartesian',
          'toggleSpikelines',
          'autoScale2d',
        ],
      }}
      layout={{
        width: heightWidth,
        height: heightWidth,
        title: plotTitle.title,
        xaxis: {title: plotTitle.xaxis},
        yaxis: {title: plotTitle.yaxis},
      }}
    />
  );
};

export default class ReactPlotlyHeatmap extends React.Component {
  constructor(props, context) {
    super(props, context);
  }

  // prevent the heatmap from re-rendering so that zoom will stay in place
  shouldComponentUpdate(nextProps, nextState) {
    if (!nextProps.heatmaprender) {
      return false;
    } else {
      return true;
    }
  }

  render() {
    if (
      !Array.isArray(this.props.zmap) ||
      !this.props.zmap.length ||
      Object.keys(this.props.heatmaptitle).length === 0
    ) {
      return <div> click on a row to render the heatmap</div>;
    } else if (this.props.zmap.length === 1 && !this.props.zmap[0].length) {
      return <div> no data to display</div>;
    }

    // const plolyPlot = this.props.rxXY ? this.renderHeatmap() : this.render2Dplot();
    const plotlyPlot = this.props.rxXY ? (
      <RenderHeatmap
        zData={this.props.zmap}
        txData={this.props.txXY}
        rxData={this.props.rxXY}
        heightWidth={this.props.height_width}
        heatmaptitle={this.props.heatmaptitle}
        oldNewBeams={this.props.oldNewBeams}
      />
    ) : (
      <Render2Dplot
        yData={this.props.zmap}
        xData={this.props.txXY}
        heightWidth={this.props.height_width}
        plotTitle={this.props.heatmaptitle}
      />
    );

    return <div>{plotlyPlot}</div>;
  }
}

ReactPlotlyHeatmap.propTypes = {
  zmap: PropTypes.array.isRequired,
  heatmaptitle: PropTypes.object.isRequired,
  txXY: PropTypes.array.isRequired,
};
