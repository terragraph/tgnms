/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import SearchBar from './SearchBar';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import {withStyles} from '@material-ui/core/styles';

import type {Node} from 'react';
import type {WithStyles} from '@material-ui/core/styles';

const styles = {
  root: {
    position: 'absolute',
    width: 240,
    top: 10,
    left: 10,
    zIndex: 10,
  },
  resultsPaper: {
    marginTop: 4,
  },
};

// Pulled this out so that it can be refined later.
type Feature = Object; // it should be a subtype of GeoJSONFeature
type Result = {feature: Feature};
type customResults = {resultsType: string, results: Array<Result>};

type Props = {
  accessToken: string,
  mapRef: ?mapboxgl.Map,
  onSelectFeature: Feature => void, // should be GeoJSONFeature
  // Mapbox geocoding API: https://www.mapbox.com/api-documentation/#geocoding
  apiEndpoint: string,
  // Debounce searches at this interval
  searchDebounceMs: number,
  // (query : str) => results : arr of obj
  getCustomResults?: ?(query: string) => customResults,
  // If getCustomResults is defined, should we search for default places?
  // (customResults : arr of obj) => bool
  shouldSearchPlaces?: ?(customResults: Array<Result>) => boolean,
  // (result : obj, handleClearInput : func) => <ListItem> or null
  onRenderResult?: ?(result: Result, handleClearInput: () => void) => Node,
} & WithStyles<typeof styles>;

type State = {
  value: string,
  isLoading: boolean,
  customResults: Array<Result>,
  placesResults: Array<Result>,
};

class MapboxGeocoder extends React.Component<Props, State> {
  static defaultProps = {
    apiEndpoint: 'https://api.mapbox.com/geocoding/v5/mapbox.places/',
    searchDebounceMs: 200,
  };

  state = {
    value: '',
    isLoading: false,
    customResults: [],
    placesResults: [],
  };

  customResultsType = null;

  getResults = query => {
    // Fetch results for the given query
    const {getCustomResults, shouldSearchPlaces} = this.props;

    // Fetch any custom results first
    let customResults = {resultsType: '', results: []};
    if (getCustomResults) {
      customResults = getCustomResults(query);
      if (shouldSearchPlaces && !shouldSearchPlaces(customResults.results)) {
        // Don't search for default place results?
        this.setState({customResults: customResults.results});
        this.customResultsType = customResults.resultsType;
        return;
      }
    }
    this.setState({customResults: customResults.results});
    this.customResultsType = customResults.resultsType;
    this.mapboxPlacesSearch(query);
  };

  mapboxPlacesSearch = query => {
    // Send an API request for the given query
    const {apiEndpoint, accessToken} = this.props;

    // Construct GET request
    // See: https://www.mapbox.com/api-documentation/#search-for-places
    const params: {[string]: string} = {
      access_token: accessToken,
      ...this.getProximity(),
    };
    const encodedParams = Object.keys(params)
      .map(k => k + '=' + params[k])
      .join('&');

    const uri =
      apiEndpoint + encodeURIComponent(query) + '.json?' + encodedParams;

    // Send request
    axios
      .get(uri)
      .then(response => {
        // Store the results
        const {features} = response.data;
        if (features) {
          this.setState({
            placesResults: [
              ...this.state.placesResults,
              ...features.map(feature => ({feature})),
            ],
            isLoading: false,
          });
        }
      })
      .catch(_err => {
        // TODO handle this better
        this.setState({placesResults: [], isLoading: false});
      });
  };

  getProximity(): {[string]: string} {
    // Return proximity arguments based on the current map center and zoom level
    // (or none if not applicable)
    const {mapRef} = this.props;
    if (mapRef && mapRef.getZoom() > 9) {
      const center = mapRef.getCenter().wrap();
      return {proximity: [center.lng, center.lat].join(',')};
    }
    return {};
  }

  handleInput = e => {
    // Handle an input value update
    this.setState({value: e.target.value});
  };

  handleClearInput = () => {
    // Clear the current input and results
    this.setState({
      value: '',
      placesResults: [],
      customResults: [],
      isLoading: false,
    });
  };

  renderPlaces = (result: Result): Node => {
    const {onSelectFeature} = this.props;
    const {feature} = result;
    const primaryText = feature.text;
    let secondaryText =
      (feature.properties && feature.properties.address) || feature.place_name;
    if (secondaryText === primaryText) {
      secondaryText = undefined; // don't show duplicate text
    }
    return (
      <ListItem
        key={'feature-' + feature.id}
        button
        dense
        onClick={() => {
          // Selected a map feature
          onSelectFeature(feature);

          // Clear the search field
          this.handleClearInput();
        }}>
        <ListItemText primary={primaryText} secondary={secondaryText} />
      </ListItem>
    );
  };

  renderResult = (result: Result): Node => {
    // Render a single result
    const {onRenderResult} = this.props;
    let listItem = null;

    // Use custom renderer (if applicable)
    if (onRenderResult && result.hasOwnProperty('feature')) {
      listItem = onRenderResult(result, this.handleClearInput.bind(this));
    }
    return listItem;
  };

  render() {
    const {classes, searchDebounceMs} = this.props;
    const {value, isLoading, customResults, placesResults} = this.state;

    return (
      <div className={classes.root}>
        <SearchBar
          value={value}
          onChange={this.handleInput}
          onClearInput={this.handleClearInput}
          onSearch={this.getResults}
          isLoading={isLoading}
          debounceMs={searchDebounceMs}
        />
        {placesResults.length > 0 || customResults.length > 0 ? (
          <Paper className={classes.resultsPaper} elevation={2}>
            {customResults.length > 0 && (
              <List component="nav">
                <ListItemText
                  primary={
                    <span>
                      <strong>{this.customResultsType}</strong>
                    </span>
                  }
                />
                {customResults.map(result => this.renderResult(result))}
              </List>
            )}
            <List component="nav">
              <ListItemText primary={<strong> Locations</strong>} />
              {placesResults.map(result => this.renderPlaces(result))}
            </List>
          </Paper>
        ) : null}
      </div>
    );
  }
}

export default withStyles(styles)(MapboxGeocoder);
