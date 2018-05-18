/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import classnames from 'classnames';
import {
  LinkOverlayKeys,
  SiteOverlayKeys,
} from "../../constants/NetworkConstants.js";
import React from "react";
import {Panel} from "react-bootstrap";

export default class DetailsLegend extends React.Component {
  state = {
    open: false,
  }

  // Values for node type legend entry icons.
  // All values chosen to try and match the leaflet markers
  nodeTypesOverlayDefaults = {
    svg: {
      width: '20',
      height: '20',
      cx: '10',
      cy: '10',
      r: '5',
      strokeWidth: '1',
      stroke: 'none',
    }
  }
  nodeTypesOverlaySource = {
    DN: {
      color: 'blue',
      svg: {},
    },
    CN: {
      color: 'pink',
      svg: {},
    },
    'Ruckus AP': {
      color: 'white',
      svg: {
        width: '48',
        height: '48',
        cx: '24',
        cy: '24',
        r: '12',
        strokeWidth: '3',
        stroke: 'purple',
      },
    }
  }

  constructor(props) {
    super(props);
  }

  render() {
    const nodeTypeOverlayKeyRows = Object.keys(this.nodeTypesOverlaySource)
      .map(nodeType => {
        // Shallow copy defaults
        let svg = Object.assign({}, this.nodeTypesOverlayDefaults.svg);
        // Merge any overrides with defaults
        Object.assign(svg, this.nodeTypesOverlaySource[nodeType].svg);

        return (<tr key={nodeType}>
          <td>
            <svg width={svg.width} height={svg.height}>
              <circle
                cx={svg.cx}
                cy={svg.cy}
                r={svg.r}
                strokeWidth={svg.strokeWidth}
                stroke={svg.stroke}
                fill={this.nodeTypesOverlaySource[nodeType].color}>
              </circle>
            </svg>
          </td>
          <td>{nodeType}</td>
        </tr>);
      }, this);

    const siteOverlaySource = SiteOverlayKeys[this.props.siteOverlay];
    const siteOverlayKeyRows = Object.keys(siteOverlaySource).map(siteState => (
      <tr key={siteState}>
        <td>
          <svg width="40" height="40">
            <circle
              cx="20"
              cy="20"
              r="10"
              fill={siteOverlaySource[siteState].color}>
            </circle>
          </svg>
        </td>
        <td>
          <font color={siteOverlaySource[siteState].color}>
            {siteState}
          </font>
        </td>
      </tr>
    ));

    // Values chosen to match leaflet markers and also look somewhat decent
    const linkMarkerWidth = "40";
    const linkMarkerHeight = "30";
    const linkMarkerX1 = "0";
    const linkMarkerY1 = "15";
    const linkMarkerX2 = "30";
    const linkMarkerY2 = "15";
    const linkMarkerStrokeWidth = 4;

    let linkOverlayKeyRows = [];
    let linkOverlaySource = LinkOverlayKeys[this.props.linkOverlay];
    const health = {
      values: [
        "Alive",
        "Ignition Candidate",
        "Dead",
      ],
      colors: [
        "green",
        "purple",
        "red",
      ],
      prefix: '',
    }

    // Health is dealt set up differently in NetworkConstants, so override here
    if (this.props.linkOverlay === "Health") {
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
                  strokeWidth: linkMarkerStrokeWidth
                }}>
              </line>
            </svg>
          </td>
          <td>
            <font style={{ color: linkOverlaySource.colors[index] }}>
              {linkOverlaySource.prefix + " " + value}
            </font>
          </td>
        </tr>
      ));

      if (this.props.linkOverlay !== "RxGolayIdx" &&
          this.props.linkOverlay !== "TxGolayIdx" &&
          this.props.linkOverlay !== "Health") {
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
                    stroke: linkOverlaySource.colors[
                      linkOverlaySource.colors.length - 1
                    ],
                    strokeWidth: linkMarkerStrokeWidth
                  }}>
                </line>
              </svg>
            </td>
            <td>
              <font
                style={{
                  color: linkOverlaySource.colors[
                    linkOverlaySource.colors.length - 1
                  ]
                }}
              >
                More than&nbsp;
                {
                  linkOverlaySource.values[linkOverlaySource.values.length - 1]
                }
              </font>
            </td>
          </tr>
        );
      }
    }

    const triangleClass = this.state.open ? 'glyphicon-triangle-bottom'
                                          : 'glyphicon-triangle-top';

    return (
      <Panel
        bsStyle="info"
        id="legendControl"
        onToggle={() => this.setState({ open: !this.state.open })}
      >
        <Panel.Heading>
          <Panel.Title componentClass="h3" toggle>
            Legend&nbsp;
            <span
              className={classnames('glyphicon', triangleClass)}
              aria-hidden="true"
              style={{float: "right"}}
            />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <Panel>
              <Panel.Body>
                <table className="details-legend-table">
                  <tbody>
                    {nodeTypeOverlayKeyRows}
                  </tbody>
                </table>
              </Panel.Body>
            </Panel>
            <Panel defaultExpanded>
              <Panel.Heading>
                <Panel.Title componentClass="h5" toggle>
                  Site Overlay: {this.props.siteOverlay}
                </Panel.Title>
              </Panel.Heading>
              <Panel.Collapse>
                <Panel.Body>
                  <table className="details-legend-table">
                    <tbody>
                      {siteOverlayKeyRows}
                    </tbody>
                  </table>
                </Panel.Body>
              </Panel.Collapse>
            </Panel>

            <Panel defaultExpanded>
              <Panel.Heading>
                <Panel.Title componentClass="h5" toggle>
                  Link Overlay: {this.props.linkOverlay}
                </Panel.Title>
              </Panel.Heading>
              <Panel.Collapse>
                <Panel.Body>
                  <table className="details-legend-table">
                    <tbody>
                      {linkOverlayKeyRows}
                    </tbody>
                  </table>
                </Panel.Body>
              </Panel.Collapse>
            </Panel>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}
