/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import useUnmount from '../../hooks/useUnmount';
import {cloneDeep} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {stringifyConfig} from '../../helpers/ConfigHelpers';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
  jsonTextarea: {
    fontFamily: 'monospace',
    height: '100%',
    border: 'none',
    margin: theme.spacing(2),
  },
}));

export default function ConfigJson() {
  const classes = useStyles();
  const {onSetJson, configOverrides, selectedValues} = useConfigTaskContext();
  const {refreshConfig} = selectedValues;

  const rawJsonDraftConfig = React.useMemo(
    () => stringifyConfig(cloneDeep(configOverrides)),
    [configOverrides],
  );

  const [rawJson, setRawJson] = React.useState(rawJsonDraftConfig);

  React.useEffect(() => {
    setRawJson(rawJsonDraftConfig);
  }, [refreshConfig, rawJsonDraftConfig]);

  const handleRawJsonChange = React.useCallback(
    evt => {
      // Handle a change to the raw JSON draft config text
      const newJson = evt.target.value;

      try {
        onSetJson(JSON.parse(newJson));
      } catch (err) {
        console.error(err.message);
      }

      setRawJson(newJson);
    },
    [onSetJson],
  );

  useUnmount(() => {
    onSetJson(null);
  });

  return (
    <textarea
      className={classes.jsonTextarea}
      data-testid="config-json"
      autoCapitalize="none"
      autoComplete="none"
      autoCorrect="none"
      spellCheck={false}
      value={rawJson}
      onChange={handleRawJsonChange}
    />
  );
}
