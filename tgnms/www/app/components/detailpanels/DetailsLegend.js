/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  LinkOverlayKeys,
  SiteOverlayKeys,
} from '../../constants/NetworkConstants.js';
import classnames from 'classnames';
import {Col, Grid, Panel, Row} from 'react-bootstrap';
import React from 'react';

export default class DetailsLegend extends React.Component {
  state = {
    legendOpen: false,
    linkOpen: true,
    siteOpen: true,
  };

  // Values for node type legend entry icons.
  // All values chosen to try and match the leaflet markers
  nodeTypesOverlayDefaults = {
    svg: {
      cx: '10',
      cy: '10',
      height: '20',
      r: '5',
      stroke: 'none',
      strokeWidth: '1',
      width: '20',
    },
  };
  nodeTypesOverlaySource = {
    CN: {
      color: 'pink',
      svg: {},
    },
    POP: {
      color: 'blue',
      svg: {},
    },
    'Ruckus AP': {
      color: 'white',
      svg: {
        cx: '24',
        cy: '24',
        height: '48',
        r: '12',
        stroke: 'purple',
        strokeWidth: '3',
        width: '48',
      },
    },
  };

  constructor(props) {
    super(props);
  }

  render() {
    const nodeTypeOverlayKeyRows = Object.keys(this.nodeTypesOverlaySource).map(
      nodeType => {
        // Shallow copy defaults
        const svg = Object.assign({}, this.nodeTypesOverlayDefaults.svg);
        // Merge any overrides with defaults
        Object.assign(svg, this.nodeTypesOverlaySource[nodeType].svg);

        return (
          <tr key={nodeType}>
            <td>
              <svg width={svg.width} height={svg.height}>
                <circle
                  cx={svg.cx}
                  cy={svg.cy}
                  r={svg.r}
                  strokeWidth={svg.strokeWidth}
                  stroke={svg.stroke}
                  fill={this.nodeTypesOverlaySource[nodeType].color}
                />
              </svg>
            </td>
            <td>{nodeType}</td>
          </tr>
        );
      },
      this,
    );

    const siteOverlaySource = SiteOverlayKeys[this.props.siteOverlay];
    const siteOverlayKeyRows = Object.keys(siteOverlaySource).map(siteState => (
      <tr key={siteState}>
        <td>
          <svg width="40" height="40">
            <circle
              cx="20"
              cy="20"
              r="10"
              fill={siteOverlaySource[siteState].color}
            />
          </svg>
        </td>
        <td>
          <span style={{color: siteOverlaySource[siteState].color}}>
            {siteState}
          </span>
        </td>
      </tr>
    ));

    // Values chosen to match leaflet markers and also look somewhat decent
    const linkMarkerWidth = '40';
    const linkMarkerHeight = '30';
    const linkMarkerX1 = '0';
    const linkMarkerY1 = '15';
    const linkMarkerX2 = '30';
    const linkMarkerY2 = '15';
    const linkMarkerStrokeWidth = 4;

    let linkOverlayKeyRows = [];
    let linkOverlaySource = LinkOverlayKeys[this.props.linkOverlay];
    const health = {
      colors: ['green', 'purple', 'red'],
      prefix: '',
      values: ['Alive', 'Ignition Candidate', 'Dead'],
    };

    // Health is set up differently in NetworkConstants, so override here
    if (this.props.linkOverlay === 'Health') {
      linkOverlaySource = health;
    }

    if (linkOverlaySource.values) {
      linkOverlayKeyRows = linkOverlaySource.values.map((value, index) => (
        <tr key={value}>
          <td>
            <svg width={linkMarkerWidth} height={linkMarkerHeight}>
              <line
                x1={linkMarkerX1}
                y1={linkMarkerY1}
                x2={linkMarkerX2}
                y2={linkMarkerY2}
                style={{
                  stroke: linkOverlaySource.colors[index],
                  strokeWidth: linkMarkerStrokeWidth,
                }}
              />
            </svg>
          </td>
          <td>
            <span style={{color: linkOverlaySource.colors[index]}}>
              {linkOverlaySource.prefix + ' ' + value}
            </span>
          </td>
        </tr>
      ));

      if (
        this.props.linkOverlay !== 'RxGolayIdx' &&
        this.props.linkOverlay !== 'TxGolayIdx' &&
        this.props.linkOverlay !== 'Health'
      ) {
        linkOverlayKeyRows.push(
          <tr key="last">
            <td>
              <svg width={linkMarkerWidth} height={linkMarkerHeight}>
                <line
                  x1={linkMarkerX1}
                  y1={linkMarkerY1}
                  x2={linkMarkerX2}
                  y2={linkMarkerY2}
                  style={{
                    stroke:
                      linkOverlaySource.colors[
                        linkOverlaySource.colors.length - 1
                      ],
                    strokeWidth: linkMarkerStrokeWidth,
                  }}
                />
              </svg>
            </td>
            <td>
              <span
                style={{
                  color:
                    linkOverlaySource.colors[
                      linkOverlaySource.colors.length - 1
                    ],
                }}>
                More than&nbsp;
                {linkOverlaySource.values[linkOverlaySource.values.length - 1]}
              </span>
            </td>
          </tr>,
        );
      }
    }

    const legendTriangleClass = this.state.legendOpen
      ? 'glyphicon-triangle-bottom'
      : 'glyphicon-triangle-top';

    const siteTriangleClass = this.state.siteOpen
      ? 'glyphicon-triangle-bottom'
      : 'glyphicon-triangle-top';

    const linkTriangleClass = this.state.linkOpen
      ? 'glyphicon-triangle-bottom'
      : 'glyphicon-triangle-top';

    return (
      <Panel
        bsStyle="info"
        id="legendControl"
        onToggle={() => this.setState({legendOpen: !this.state.legendOpen})}>
        <Panel.Heading>
          <Panel.Title componentClass="h3" toggle>
            Legend&nbsp;
            <span
              className={classnames('glyphicon', legendTriangleClass)}
              aria-hidden="true"
              style={{float: 'right'}}
            />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <Grid style={{width: '750px'}}>
              <Row className='details-legend-row'>
                <Col xs={3}>
                  <Panel>
                    <Panel.Body>
                      <table className="details-legend-table">
                        <tbody>{nodeTypeOverlayKeyRows}</tbody>
                      </table>
                    </Panel.Body>
                  </Panel>
                </Col>

                <Col xs={5}>
                  <Panel
                    defaultExpanded
                    onToggle={() => this.setState({
                      siteOpen: !this.state.siteOpen
                    })}
                  >
                    <Panel.Heading>
                      <Panel.Title componentClass="h5" toggle>
                        Site Overlay: {this.props.siteOverlay}&nbsp;
                        <span
                          className={classnames('glyphicon', siteTriangleClass)}
                          aria-hidden="true"
                          style={{float: 'right'}}
                        />
                      </Panel.Title>
                    </Panel.Heading>
                    <Panel.Collapse>
                      <Panel.Body>
                        <table className="details-legend-table">
                          <tbody>{siteOverlayKeyRows}</tbody>
                        </table>
                      </Panel.Body>
                    </Panel.Collapse>
                  </Panel>
                </Col>

                <Col xs={5}>
                  <Panel
                    defaultExpanded
                    onToggle={() => this.setState({
                      linkOpen: !this.state.linkOpen
                    })}
                  >
                    <Panel.Heading>
                      <Panel.Title componentClass="h5" toggle>
                        Link Overlay: {this.props.linkOverlay}&nbsp;
                        <span
                          className={classnames('glyphicon', linkTriangleClass)}
                          aria-hidden="true"
                          style={{float: 'right'}}
                        />
                      </Panel.Title>
                    </Panel.Heading>
                    <Panel.Collapse>
                      <Panel.Body>
                        <table className="details-legend-table">
                          <tbody>{linkOverlayKeyRows}</tbody>
                        </table>
                      </Panel.Body>
                    </Panel.Collapse>
                  </Panel>
                </Col>
              </Row>
            </Grid>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}
