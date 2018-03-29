import React from "react";
import { render } from "react-dom";
import Modal from "react-modal";
import {
  SiteOverlayKeys,
  linkOverlayKeys,
  MapDimensions,
  MapTiles
} from "./constants/NetworkConstants.js";

const customModalStyle = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)"
  }
};

export default class ModalOverlays extends React.Component {
  state = {
    selectedSiteOverlay: "Health",
    selectedLinkOverlay: "Health",
    selectedMapDimType: "Default",
    selectedMapTile: "Default"
  };

  componentDidMount() {
    if (
      this.props.selectedSiteOverlay &&
      this.props.selectedLinkOverlay &&
      this.props.selectedMapDimType &&
      this.props.selectedMapTile
    ) {
      this.setState({
        selectedSiteOverlay: this.props.selectedSiteOverlay,
        selectedLinkOverlay: this.props.selectedLinkOverlay,
        selectedMapDimType: this.props.selectedMapDimType,
        selectedMapTile: this.props.selectedMapTile
      });
    }
  }

  modalClose() {
    this.props.onClose(
      this.state.selectedSiteOverlay,
      this.state.selectedLinkOverlay,
      this.state.selectedMapDimType,
      this.state.selectedMapTile
    );
  }

  render() {
    let siteOverlayKeyRows = [];
    let siteOverlaySource = SiteOverlayKeys[this.state.selectedSiteOverlay];
    Object.keys(siteOverlaySource).map(siteState => {
      siteOverlayKeyRows.push(
        <tr key={siteState}>
          <td />
          <td>
            <font color={siteOverlaySource[siteState].color}>
              {" "}
              {siteState}{" "}
            </font>
          </td>
        </tr>
      );
    });
    let linkOverlayKeyRows = [];
    let linkOverlaySource = linkOverlayKeys[this.state.selectedLinkOverlay];
    if (linkOverlaySource.values) {
      if (
        this.state.selectedLinkOverlay == "RxGolayIdx" ||
        this.state.selectedLinkOverlay == "TxGolayIdx"
      ) {
        for (var i = 0; i < linkOverlaySource.values.length; ++i) {
          linkOverlayKeyRows.push(
            <tr key={linkOverlaySource.values[i]}>
              <td />
              <td>
                <font style={{ color: linkOverlaySource.colors[i] }}>
                  {" "}
                  Equals {linkOverlaySource.values[i]}{" "}
                </font>
              </td>
            </tr>
          );
        }
      } else {
        for (var i = 0; i < linkOverlaySource.values.length; ++i) {
          linkOverlayKeyRows.push(
            <tr key={linkOverlaySource.values[i]}>
              <td />
              <td>
                <font style={{ color: linkOverlaySource.colors[i] }}>
                  {" "}
                  less than {linkOverlaySource.values[i]}{" "}
                </font>
              </td>
            </tr>
          );
        }
        linkOverlayKeyRows.push(
          <tr key="last">
            <td />
            <td>
              <font
                style={{
                  color:
                    linkOverlaySource.colors[
                      linkOverlaySource.colors.length - 1
                    ]
                }}
              >
                {" "}
                more than{" "}
                {
                  linkOverlaySource.values[linkOverlaySource.values.length - 1]
                }{" "}
              </font>
            </td>
          </tr>
        );
      }
    }

    return (
      <Modal
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
        style={customModalStyle}
        contentLabel="Example Modal"
      >
        <table>
          <tbody>
            <tr>
              <td width={120}>Site Overlay</td>
              <td width={100}>
                <div style={{ width: 100 }}>
                  <select
                    style={{ width: 100 }}
                    value={this.state.selectedSiteOverlay}
                    onChange={ev => {
                      this.setState({
                        selectedSiteOverlay: ev.currentTarget.value
                      });
                    }}
                  >
                    {Object.keys(SiteOverlayKeys).map(overlay => (
                      <option key={overlay} value={overlay}>
                        {overlay}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
            {siteOverlayKeyRows}
            <tr className="blank_row" />
            <tr>
              <td width={120}>Link Overlay</td>
              <td width={100}>
                <div style={{ width: 100 }}>
                  <select
                    style={{ width: 100 }}
                    value={this.state.selectedLinkOverlay}
                    onChange={ev => {
                      this.setState({
                        selectedLinkOverlay: ev.currentTarget.value
                      });
                    }}
                  >
                    {Object.keys(linkOverlayKeys).map(overlay => (
                      <option key={overlay} value={overlay}>
                        {overlay}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
            {linkOverlayKeyRows}
            <tr>
              <td width={120}>Map Markers</td>
              <td width={100}>
                <div style={{ width: 100 }}>
                  <select
                    style={{ width: 100 }}
                    value={this.state.selectedMapDimType}
                    onChange={ev => {
                      this.setState({
                        selectedMapDimType: ev.currentTarget.value
                      });
                    }}
                  >
                    {Object.keys(MapDimensions).map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
            <tr>
              <td width={120}>Map Tile</td>
              <td width={100}>
                <div style={{ width: 100 }}>
                  <select
                    style={{ width: 100 }}
                    value={this.state.selectedMapTile}
                    onChange={ev => {
                      this.setState({
                        selectedMapTile: ev.currentTarget.value
                      });
                    }}
                  >
                    {Object.keys(MapTiles).map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
            <tr className="blank_row" />
            <tr>
              <td colSpan={2}>
                <button
                  style={{ float: "left" }}
                  className="graph-button"
                  onClick={this.modalClose.bind(this)}
                >
                  close
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
