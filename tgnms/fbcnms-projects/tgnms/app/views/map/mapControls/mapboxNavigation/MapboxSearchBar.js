/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MapboxControl from '@fbcnms/tg-nms/app/views/map/mapControls/MapboxControl';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import SearchBar from '@fbcnms/tg-nms/app/components/common/SearchBar';
import axios from 'axios';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {getUIEnvVal} from '@fbcnms/tg-nms/app/common/uiConfig';
import {makeStyles} from '@material-ui/styles';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

import type {Feature, Result} from './MapboxSearchTypes';

const useStyles = makeStyles(theme => ({
  resultsPaper: {
    position: 'absolute',
    zIndex: theme.zIndex.drawer,
    margin: `${theme.spacing(6.75)}px 0 0 ${theme.spacing()}px`,
    minWidth: theme.spacing(28.75),
    width: 'min-content',
  },
  resultsList: {
    overflow: 'auto',
    maxHeight: theme.spacing(37.5),
  },
}));

type Props = {
  onSelectFeature: Feature => any,
  getCustomResults: string => any,
  shouldSearchPlaces: (Array<Result>) => any,
  onRenderResult: (Object, () => any) => any,
  apiEndpoint?: string,
  searchDebounceMs?: number,
};
const MAPBOX_ACCESS_TOKEN = getUIEnvVal('MAPBOX_ACCESS_TOKEN');

export default function MapboxSearchBar(props: Props) {
  const {mapboxRef} = useMapContext();
  const classes = useStyles();
  const {
    getCustomResults,
    shouldSearchPlaces,
    onSelectFeature,
    onRenderResult,
  } = props;

  const apiEndpoint =
    props.apiEndpoint ?? 'https://api.mapbox.com/geocoding/v5/mapbox.places/';
  const searchDebounceMs = props.searchDebounceMs ?? 100;

  const [value, setValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // {feature: obj}, or custom structures via getCustomResults()
  const [results, setResults] = React.useState([]);

  const getResults = query => {
    // Fetch any custom results first
    let tempResults = [];
    setResults(tempResults);
    if (getCustomResults) {
      tempResults = getCustomResults(query);
      if (shouldSearchPlaces && !shouldSearchPlaces(tempResults)) {
        return setResults(tempResults);
      }
    }
    setIsLoading(true);
    mapboxPlacesSearch(query);
  };

  const mapboxPlacesSearch = query => {
    // Construct GET request
    // See: https://www.mapbox.com/api-documentation/#search-for-places
    const params = {
      access_token: MAPBOX_ACCESS_TOKEN,
      ...getProximity(),
    };
    const encodedParams = objectEntriesTypesafe<string, string>(params)
      .map(kv => kv.map(encodeURIComponent).join('='))
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
          setResults([...results, ...features.map(feature => ({feature}))]);
          setIsLoading(false);
        }
      })
      .catch(_err => {
        // TODO handle this better
        setResults([]);
        setIsLoading(false);
      });
  };

  const getProximity = () => {
    // Return proximity arguments based on the current map center and zoom level
    // (or none if not applicable)
    if (mapboxRef && mapboxRef.getZoom() > 9) {
      const center = mapboxRef.getCenter().wrap();
      return {proximity: [center.lng, center.lat].join(',')};
    }
    return {};
  };

  const handleInput = e => {
    // Handle an input value update
    setValue(e.target.value);
  };

  const handleClearInput = () => {
    // Clear the current input and results
    setValue('');
    setResults([]);
    setIsLoading(false);
  };

  const renderResult = result => {
    // Use custom renderer (if applicable)
    if (onRenderResult) {
      const listItem = onRenderResult(result, handleClearInput.bind(this));
      if (listItem !== null) {
        return listItem;
      }
    }

    // Render feature
    if (!result.hasOwnProperty('feature')) {
      return null; // shouldn't happen (unhandled result in getCustomResults)
    }
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
          onSelectFeature(result.feature);

          // Clear the search field
          handleClearInput();
        }}>
        <ListItemText primary={primaryText} secondary={secondaryText} />
      </ListItem>
    );
  };

  return (
    <>
      <MapboxControl
        mapLocation={MAP_CONTROL_LOCATIONS.TOP_LEFT}
        data-testid="tg-nav-container">
        <div data-testid="mapbox-search-bar" className={STEP_TARGET.SEARCH}>
          <SearchBar
            value={value}
            onChange={handleInput}
            onClearInput={handleClearInput}
            onSearch={getResults}
            isLoading={isLoading}
            debounceMs={searchDebounceMs}
          />
        </div>
      </MapboxControl>
      {results.length > 0 ? (
        <Paper className={classes.resultsPaper} elevation={6}>
          <List className={classes.resultsList} component="nav">
            {results.map(result => renderResult(result))}
          </List>
        </Paper>
      ) : null}
    </>
  );
}
