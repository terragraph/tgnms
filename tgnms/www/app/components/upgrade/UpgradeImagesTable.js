/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import classNames from 'classnames';
import PropTypes from 'prop-types';
import Clipboard from 'clipboard';
import {Glyphicon, ListGroup, ListGroupItem} from 'react-bootstrap';
import {render} from 'react-dom';
import React from 'react';
import Tooltip from 'react-tooltip';

export default class UpgradeImagesTable extends React.Component {
  static propTypes = {
    images: PropTypes.array.isRequired,
    onDeleteImage: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.clipboard = new Clipboard('.magnet-button');
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  render() {
    return (
      <ListGroup className="image-table">
        {this.props.images.map((image, index) => (
          <ListGroupItem className="image-table-item" key={image.name}>
            <Glyphicon
              data-clipboard-text={image.magnetUri}
              data-tip="Copy Magnet URI"
              className="magnet-button"
              glyph="magnet"
            />
            <div>
              <div className="image-table-title">{image.name}</div>
              <div className="image-table-subtitle">{`MD5: ${image.md5}`}</div>
              {image.hardwareBoardIds &&
                image.hardwareBoardIds.length > 0 && (
                  <div className="image-table-subtitle">
                    {`Boards: ${image.hardwareBoardIds.join(', ')}`}
                  </div>
                )}
            </div>
            <Glyphicon
              className="remove-button"
              glyph="remove"
              onClick={() => this.props.onDeleteImage(image.name)}
            />
          </ListGroupItem>
        ))}
        <Tooltip place="top" effect="solid" />
      </ListGroup>
    );
  }
}
