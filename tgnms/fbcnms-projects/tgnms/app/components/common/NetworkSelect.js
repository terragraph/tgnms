/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';

import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useNetworkListContext} from '@fbcnms/tg-nms/app/contexts/NetworkListContext';

export default function NetworkSelect({
  value,
  onChange,
}: {|
  value: string | Array<string>,
  onChange: (string | Array<string>) => void,
|}) {
  const {networkList} = useNetworkListContext();
  const networks = networkList ? objectEntriesTypesafe(networkList) : [];
  const onChangeRef = useLiveRef(onChange);
  const handleChange = React.useCallback(
    (e: SyntheticInputEvent<HTMLSelectElement>) => {
      onChangeRef.current((e.target.value: any));
    },
    [onChangeRef],
  );
  return (
    <TextField
      label="Networks"
      select
      SelectProps={{
        value: Array.isArray(value) ? value : [value],
        multiple: Array.isArray(value),
      }}
      onChange={handleChange}>
      {networks.map(([name, _network]) => (
        <MenuItem key={name} value={name}>
          {name}
        </MenuItem>
      ))}
    </TextField>
  );
}
