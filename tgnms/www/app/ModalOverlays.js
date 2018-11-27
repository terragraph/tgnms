/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  SiteOverlayKeys,
  LinkOverlayKeys,
  MapDimensions,
  MapTiles,
} from './constants/NetworkConstants.js';
import {render} from 'react-dom';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import React from 'react';

const customModalStyle = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

export default class ModalOverlays extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    selectedSiteOverlay: PropTypes.string.isRequired,
    selectedLinkOverlay: PropTypes.string.isRequired,
    selectedMapDimType: PropTypes.string.isRequired,
    selectedMapTile: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  render() {
    const siteOverlaySource = SiteOverlayKeys[this.props.selectedSiteOverlay];
    const siteOverlayKeyRows = Object.keys(siteOverlaySource).map(siteState => (
      <tr key={siteState}>
        <td />
        <td>
          <font color={siteOverlaySource[siteState].color}>{siteState}</font>
        </td>
      </tr>
    ));
    let linkOverlayKeyRows = [];
    const linkOverlaySource = LinkOverlayKeys[this.props.selectedLinkOverlay];
    if (linkOverlaySource.values) {
      linkOverlayKeyRows = linkOverlaySource.values.map((value, index) => (
        <tr key={value}>
          <td />
          <td>
            <font style={{color: linkOverlaySource.colors[index]}}>
              {linkOverlaySource.hasOwnProperty('prefix')
                ? linkOverlaySource.prefix + ' ' + value
                : value}
            </font>
          </td>
        </tr>
      ));

      if (linkOverlaySource.hasOwnProperty('prefix')) {
        linkOverlayKeyRows.push(
          <tr key="last">
            <td />
            <td>
              <font
                style={{
                  color:
                    linkOverlaySource.colors[
                      linkOverlaySource.colors.length - 1
                    ],
                }}>
                More than&nbsp;
                {linkOverlaySource.values[linkOverlaySource.values.length - 1]}
              </font>
            </td>
          </tr>,
        );
      }
    }

    return (
      <Modal
        isOpen={this.props.isOpen}
        onRequestClose={() => {
          this.props.onChange(
            false,
            this.props.selectedSiteOverlay,
            this.props.selectedLinkOverlay,
            this.props.selectedMapDimType,
            this.props.selectedMapTile,
          );
        }}
        style={customModalStyle}>
        <table>
          <tbody>
            <tr>
              <td width={120}>Site Overlay</td>
              <td width={100}>
                <div style={{width: 100}}>
                  <select
                    style={{width: 100}}
                    value={this.props.selectedSiteOverlay}
                    onChange={ev => {
                      this.props.onChange(
                        true,
                        ev.currentTarget.value,
                        this.props.selectedLinkOverlay,
                        this.props.selectedMapDimType,
                        this.props.selectedMapTile,
                      );
                    }}>
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
                <div style={{width: 100}}>
                  <select
                    style={{width: 100}}
                    value={this.props.selectedLinkOverlay}
                    onChange={ev => {
                      this.props.onChange(
                        true,
                        this.props.selectedSiteOverlay,
                        ev.currentTarget.value,
                        this.props.selectedMapDimType,
                        this.props.selectedMapTile,
                      );
                    }}>
                    {Object.keys(LinkOverlayKeys).map(overlay => (
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
                <div style={{width: 100}}>
                  <select
                    style={{width: 100}}
                    value={this.props.selectedMapDimType}
                    onChange={ev => {
                      this.props.onChange(
                        true,
                        this.props.selectedSiteOverlay,
                        this.props.selectedLinkOverlay,
                        ev.currentTarget.value,
                        this.props.selectedMapTile,
                      );
                    }}>
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
                <div style={{width: 100}}>
                  <select
                    style={{width: 100}}
                    value={this.props.selectedMapTile}
                    onChange={ev => {
                      this.props.onChange(
                        true,
                        this.props.selectedSiteOverlay,
                        this.props.selectedLinkOverlay,
                        this.props.selectedMapDimType,
                        ev.currentTarget.value,
                      );
                    }}>
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
                  style={{float: 'left'}}
                  className="graph-button"
                  onClick={() => {
                    this.props.onChange(
                      false,
                      this.props.selectedSiteOverlay,
                      this.props.selectedLinkOverlay,
                      this.props.selectedMapDimType,
                      this.props.selectedMapTile,
                    );
                  }}>
                  Close
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
