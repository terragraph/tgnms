/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {cloneDeep} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {stringifyConfig} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

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
  const {onSetJson, configOverrides} = useConfigTaskContext();

  const rawJsonDraftConfig = React.useMemo(
    () => stringifyConfig(cloneDeep(configOverrides)),
    [configOverrides],
  );
  const [rawJson, setRawJson] = React.useState(rawJsonDraftConfig);

  React.useEffect(() => {
    setRawJson(rawJsonDraftConfig);
  }, [rawJsonDraftConfig]);

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
