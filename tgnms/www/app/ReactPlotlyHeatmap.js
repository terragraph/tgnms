/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from 'react';

//import Plot from 'react-plotly.js'

export default class ReactPlotlyHeatmap extends React.Component {
  constructor(props, context) {
    super(props, context);
  }

  createXYarray() {
    const xy = Array.from(new Array(64), (val, index) => index - 33);
    return xy;
  }

  // create a 2-D array of the same dimensions as zmap so that
  // it will say "SNR" when you hover over the heatmap
  createSnr() {
    const arr = [];
    for (let i = 0; i < this.props.zmap.length; i++) {
      arr[i] = this.props.zmap[i].map(x => 'SNR');
    }
    return arr;
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
    return <div>Unsupported</div>;

    // if (!this.props.zmap || !this.props.heatmaptitle) {
    //   return <div> click on a row to render the heatmap</div>;
    // }
    // const xy = this.createXYarray();
    // const snrtxt = this.createSnr();
    // return (
    //   <Plot
    //     data={[
    //       {
    //         type: 'heatmap',
    //         x: xy,
    //         y: xy,
    //         z: this.props.zmap,
    //         zmin: -10,
    //         colorscale: 'YIGnBu',
    //         text: snrtxt,
    //         hoverinfo: 'x+y+z+text',
    //         zmax: 22,
    //       },
    //     ]}
    //     config={{
    //       // displayModeBar: false,
    //       displaylogo: false,
    //       modeBarButtonsToRemove: [
    //         'sendDataToCloud',
    //         'hoverClosestCartesian',
    //         'hoverCompareCartesian',
    //         'toggleSpikelines',
    //         'autoScale2d',
    //       ],
    //     }}
    //     layout={{
    //       width: this.props.height_width,
    //       height: this.props.height_width,
    //       title: this.props.heatmaptitle.title,
    //       xaxis: {title: this.props.heatmaptitle.xaxis},
    //       yaxis: {title: this.props.heatmaptitle.yaxis},
    //     }}
    //   />
    // );
  }
}

ReactPlotlyHeatmap.propTypes = {
  zmap: PropTypes.array.isRequired,
  heatmaptitle: PropTypes.array.isRequired,
};
