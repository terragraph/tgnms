import React from "react";
import { render } from "react-dom";
import {
  SiteOverlayKeys, linkOverlayKeys
} from "../../constants/NetworkConstants.js";
import Dispatcher from "../../NetworkDispatcher.js";
import { Grid, Row, Col, Panel } from "react-bootstrap";

export default class DetailsLegend extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
    }
  }

  render() {
    let siteOverlayKeyRows = [];
    let siteOverlaySource = SiteOverlayKeys[this.props.siteOverlay];
    Object.keys(siteOverlaySource).map(siteState => {
      siteOverlayKeyRows.push(
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
      );
    });

    let linkMarkerWidth = "40";
    let linkMarkerHeight = "30";
    let linkMarkerX1 = "0";
    let linkMarkerY1 = "15";
    let linkMarkerX2 = "30";
    let linkMarkerY2 = "15";
    let linkMarkerStrokeWidth = 4;
    let linkOverlayKeyRows = [];
    let linkOverlaySource = linkOverlayKeys[this.props.linkOverlay];
    let health = {
      values: [
        "Alive",
        "Igniting",
        "Dead",
      ],
      colors: [
        "green",
        "purple",
        "red",
      ],
    }

    if (this.props.linkOverlay === "Health") {
      linkOverlaySource = health;
    }

    if (linkOverlaySource.values) {
      let prefix = "Less than";
      if (this.props.linkOverlay === "RxGolayIdx" ||
          this.props.linkOverlay === "TxGolayIdx") {
        prefix = "Equals";
      } else if (this.props.linkOverlay === "Health") {
        prefix = "";
      }

      for (var i = 0; i < linkOverlaySource.values.length; ++i) {
        linkOverlayKeyRows.push(
          <tr key={linkOverlaySource.values[i]}>
            <td>
              <svg width={linkMarkerWidth} height={linkMarkerHeight}>
                <line
                  x1={linkMarkerX1}
                  y1={linkMarkerY1}
                  x2={linkMarkerX2}
                  y2={linkMarkerY2}
                  style={{
                    stroke: linkOverlaySource.colors[i],
                    strokeWidth: linkMarkerStrokeWidth
                  }}>
                </line>
              </svg>
            </td>
            <td>
              <font style={{ color: linkOverlaySource.colors[i] }}>
                {prefix + " " + linkOverlaySource.values[i]}
              </font>
            </td>
          </tr>
        );
      }
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
                    stroke: linkOverlaySource.colors[i],
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

    let triangleClass = this.state.open ?
      "glyphicon glyphicon-triangle-bottom" :
      "glyphicon glyphicon-triangle-top";

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
              className={triangleClass}
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
                    <tr>
                      <td>
                        <svg width="20" height="20">
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="blue">
                          </circle>
                        </svg>
                      </td>
                      <td>DN</td>
                    </tr>
                    <tr>
                      <td>
                        <svg width="20" height="20">
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="pink">
                          </circle>
                        </svg>
                      </td>
                      <td>CN</td>
                    </tr>
                    <tr>
                      <td>
                        <svg width="48" height="48">
                          <circle
                            cx="24"
                            cy="24"
                            r="12"
                            fill="white"
                            strokeWidth="3"
                            stroke="purple">
                          </circle>
                        </svg>
                      </td>
                      <td>Ruckus AP</td>
                    </tr>
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
