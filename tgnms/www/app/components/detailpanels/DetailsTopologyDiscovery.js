/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import Clipboard from 'clipboard';
import {Glyphicon, Panel} from 'react-bootstrap';
import NumericInput from 'react-numeric-input';
import React from 'react';
import Tooltip from 'react-tooltip';
import Select from 'react-select';
import swal from 'sweetalert2';
import PropTypes from 'prop-types';

export default class DetailsTopologyDiscovery extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    maxHeight: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    sites: PropTypes.object.isRequired,
    siteLinks: PropTypes.array.isRequired,
    onSiteLinkUpdate: PropTypes.func.isRequired,
  };

  state = {
    // StartNetworkTopologyScan request parameters
    req: {
      cnSites: [],
      yStreetSites: [],
      beamAnglePenalty: 0.1,
      distanceThreshold: 50,
      snrThreshold: 6.1,
      scansPerNode: 1,
    },

    // Raw string fields (will get converted to arrays)
    siteLinksStr: '',
    siteLinksFormError: false,
    macAddrsStr: '',
  };

  constructor(props) {
    super(props);
    this.state.siteLinksStr = this.stringifySiteLinks(props.siteLinks);
  }

  componentDidMount() {
    this.clipboard = new Clipboard('.details-glyph-button');
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  componentDidUpdate(prevProps, prevState) {
    // If we received new site links, update our form value
    if (this.props.siteLinks.length !== prevProps.siteLinks.length) {
      const siteLinksStr = this.stringifySiteLinks(this.props.siteLinks);
      if (siteLinksStr !== prevState.siteLinksStr) {
        this.setState({siteLinksStr, siteLinksFormError: false});
      }
    }
  }

  onFormChange(attribute, value) {
    // Update state based on form input
    const req = this.state.req;
    req[attribute] = value;
    this.setState({req});
  }

  onInputChange(attribute, inputValue, filterFunction) {
    // Split a comma-separated input string into multiple inputs
    if (inputValue.includes(',')) {
      let value = this.splitCSV(inputValue);
      if (filterFunction) {
        value = value.filter(filterFunction);
      }
      const set = new Set(value); // remove duplicates
      if (set) {
        // Append to existing values
        const merged = new Set([...this.state.req[attribute], ...set]);
        this.onFormChange(attribute, [...merged]);
      }
      return '';
    } else {
      return inputValue;
    }
  }

  onSiteLinkFormChange(value) {
    // Update site links
    let error = false;
    let arr = [];
    if (value.trim().length > 0) {
      try {
        arr = JSON.parse(value);
        this.validateSiteLinks(arr);
      } catch (e) {
        arr = [];
        error = true;
      }
    }
    this.setState({siteLinksStr: value, siteLinksFormError: error});
    this.props.onSiteLinkUpdate(arr);
  }

  splitCSV(value) {
    // Splits a comma-separated string and trims tokens
    return value
      .split(',')
      .map(token => token.trim())
      .filter(x => x);
  }

  stringifySiteLinks(arr) {
    // Stringify an array of site links
    return arr.length ? JSON.stringify(arr) : '';
  }

  validateSiteLinks(arr) {
    // Validates an array of site links in the following format:
    // [{"aSite": "...", "zSite": "..."}, <...>]
    const {sites} = this.props;
    if (!Array.isArray(arr)) {
      throw new TypeError('The site links must be formatted as a JSON array.');
    }
    for (let i = 0, n = arr.length; i < n; i++) {
      const obj = arr[i];
      if (typeof obj !== 'object' || obj === null) {
        throw new TypeError('Found non-object entry at index ' + i + '.');
      }
      if (!obj.hasOwnProperty('aSite') || !obj.hasOwnProperty('zSite')) {
        throw new TypeError('Missing "aSite" or "zSite" at index ' + i + '.');
      }
      if (!sites.hasOwnProperty(obj.aSite)) {
        throw new Error('Site "' + obj.aSite + '" does not exist.');
      }
      if (!sites.hasOwnProperty(obj.zSite)) {
        throw new Error('Site "' + obj.zSite + '" does not exist.');
      }
    }
  }

  showSiteLinksHelpModal() {
    // Information modal about site links UI
    // TODO: Make the behavior changes clearer to users (without necessarily
    // needing to click on this "info" icon).
    swal({
      title: 'Topology Discovery',
      html:
        '<p>This feature uses broadcast scans to find the best wireless links ' +
        'to form. You must provide <strong>site link</strong> details to ' +
        'determine how sites should be connected.</p>' +
        '<p>To add a site link, click on two sites on the map.<br>' +
        'You can remove an existing site link the same way.</p>',
      type: 'info',
    });
  }

  submitForm() {
    // Validate site links
    if (!this.state.siteLinksStr) {
      swal({
        title: 'No Site Links!',
        text: 'You must provide a list of site links to discover.',
        type: 'error',
      });
      return;
    }
    let siteLinks;
    try {
      siteLinks = JSON.parse(this.state.siteLinksStr);
    } catch (e) {
      swal({
        title: 'Invalid Site Links!',
        html:
          'The provided site links are not valid JSON:' +
          '<pre class="details-pre-wrap">' +
          e.toString() +
          '</pre>',
        type: 'error',
      });
      return;
    }
    try {
      this.validateSiteLinks(siteLinks);
    } catch (e) {
      swal({
        title: 'Invalid Site Links!',
        html:
          'The provided site links are incorrect:' +
          '<pre class="details-pre-wrap">' +
          e.toString() +
          '</pre>',
        type: 'error',
      });
      return;
    }

    // Construct request
    const data = this.state.req;
    data['siteLinks'] = siteLinks;
    data['macAddrs'] = this.splitCSV(this.state.macAddrsStr);

    // Confirm and send request
    swal({
      title: 'Start Discovery Scans?',
      text: 'This will initiate discovery scans with the given parameters.',
      type: 'question',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return new Promise((resolve, reject) => {
          apiServiceRequest(
            this.props.topologyName,
            'startNetworkTopologyScan',
            data,
          )
            .then(response =>
              resolve({success: true, msg: response.data.message}),
            )
            .catch(error =>
              resolve({success: false, msg: getErrorTextFromE2EAck(error)}),
            );
        });
      },
    }).then(result => {
      if (result.dismiss) {
        return false;
      }
      if (result.value.success) {
        swal({
          title: 'Discovery Scans Started!',
          text: result.value.msg + '.',
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: result.value.msg + '.',
          type: 'error',
        });
      }
      return true;
    });
  }

  render() {
    const {maxHeight, onClose, onMouseEnter, onMouseLeave, sites} = this.props;
    const {req, macAddrsStr, siteLinksStr, siteLinksFormError} = this.state;

    const siteOptions = Object.keys(sites).map(site => ({
      value: site,
      label: site,
    }));

    let siteLinkFormClass = 'form-control';
    if (siteLinksFormError) {
      siteLinkFormClass += ' details-form-error';
    }

    return (
      <Panel
        id="StartTopologyDiscoveryModal"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}>
        <Panel.Heading>
          <span
            role="button"
            tabIndex="0"
            className="details-close"
            onClick={onClose}>
            &times;
          </span>
          <Panel.Title componentClass="h3">Start Scans</Panel.Title>
        </Panel.Heading>
        <Panel.Body className="details" style={{maxHeight, width: '100%'}}>
          <div className="form-group">
            <label htmlFor="siteLinks">
              Site Links
              <Glyphicon
                className="details-glyph-button"
                glyph="info-sign"
                data-tip="Help"
                onClick={this.showSiteLinksHelpModal}
              />
            </label>
            <textarea
              id="siteLinks"
              className={siteLinkFormClass}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={event => this.onSiteLinkFormChange(event.target.value)}
              value={siteLinksStr}
            />
          </div>
          <div className="form-group">
            <label htmlFor="macAddrs">MAC Addresses</label>
            <textarea
              id="macAddrs"
              className="form-control"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={event =>
                this.setState({macAddrsStr: event.target.value})
              }
              value={macAddrsStr}
              placeholder="00:00:00:00:00:01, aa:bb:cc:dd:ee:ff"
            />
          </div>
          <div className="form-group">
            <label htmlFor="cnSites">
              CN Sites
              <Glyphicon
                className="details-glyph-button"
                glyph="copy"
                data-clipboard-text={req.cnSites.join(',')}
                data-tip="Copy"
              />
            </label>
            <Select
              id="cnSites"
              className="details-select"
              multi={true}
              options={siteOptions}
              onChange={val =>
                this.onFormChange('cnSites', val ? val.map(v => v.value) : [])
              }
              onInputChange={input =>
                this.onInputChange('cnSites', input, x =>
                  sites.hasOwnProperty(x),
                )
              }
              value={req.cnSites}
            />
          </div>
          <div className="form-group">
            <label htmlFor="yStreetSites">
              Y-Street Sites
              <Glyphicon
                className="details-glyph-button"
                glyph="copy"
                data-clipboard-text={req.yStreetSites.join(',')}
                data-tip="Copy"
              />
            </label>
            <Select
              id="yStreetSites"
              className="details-select"
              multi={true}
              options={siteOptions}
              onChange={val =>
                this.onFormChange(
                  'yStreetSites',
                  val ? val.map(v => v.value) : [],
                )
              }
              onInputChange={input =>
                this.onInputChange('yStreetSites', input, x =>
                  sites.hasOwnProperty(x),
                )
              }
              value={req.yStreetSites}
            />
          </div>
          <div className="form-group">
            <label htmlFor="beamAnglePenalty">Beam Angle Penalty</label>
            <NumericInput
              id="beamAnglePenalty"
              className="form-control"
              style={false}
              value={req.beamAnglePenalty}
              precision={5}
              onChange={value => this.onFormChange('beamAnglePenalty', value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="distanceThreshold">Distance Threshold (m)</label>
            <NumericInput
              id="distanceThreshold"
              className="form-control"
              style={false}
              value={req.distanceThreshold}
              precision={5}
              onChange={value => this.onFormChange('distanceThreshold', value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="snrThreshold">SNR Threshold (dB)</label>
            <NumericInput
              id="snrThreshold"
              className="form-control"
              style={false}
              value={req.snrThreshold}
              precision={5}
              onChange={value => this.onFormChange('snrThreshold', value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="scansPerNode">Scans Per Node</label>
            <NumericInput
              id="scansPerNode"
              className="form-control"
              style={false}
              value={req.scansPerNode}
              min={1}
              onChange={value => this.onFormChange('scansPerNode', value)}
            />
          </div>
          <div className="form-group" style={{textAlign: 'center'}}>
            <button className="graph-button" onClick={() => this.submitForm()}>
              Submit
            </button>
          </div>
        </Panel.Body>
        <Tooltip place="right" effect="solid" />
      </Panel>
    );
  }
}
