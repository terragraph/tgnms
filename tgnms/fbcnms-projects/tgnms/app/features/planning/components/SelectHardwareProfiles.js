/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useHardwareProfiles} from '@fbcnms/tg-nms/app/features/hwprofiles/hooks';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import type {HardwareProfile} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';

export type Props = {|
  id: string,
  initialProfiles: ?Array<string>,
  onChange: (Array<string>) => void,
|};

export default function SelectHardwareProfiles({
  id,
  initialProfiles,
  onChange,
}: Props) {
  const autocompleteState = useModalState();
  const {profiles} = useHardwareProfiles();
  const options = React.useMemo<Array<HardwareProfile>>(
    () =>
      profiles != null
        ? objectValuesTypesafe<HardwareProfile>(profiles)
            // planner already has a default profile
            .filter(x => x.hwBoardId !== 'default')
        : [],
    [profiles],
  );
  const [selected, setSelected] = React.useState<Array<HardwareProfile>>([]);
  React.useEffect(() => {
    const set = new Set(initialProfiles ?? []);
    setSelected(options.filter(opt => set.has(opt.hwBoardId)));
  }, [initialProfiles, options]);
  const handleChange = React.useCallback(
    (event, values: Array<HardwareProfile>) => {
      setSelected(values);
      const hwBoardIds = values.map(x => x.hwBoardId);
      onChange(hwBoardIds);
    },
    [onChange],
  );

  return (
    <Autocomplete
      multiple
      id={id}
      limitTags={2}
      data-testid={`${id}-autocomplete`}
      size="small"
      open={autocompleteState.isOpen}
      onOpen={autocompleteState.open}
      onClose={autocompleteState.close}
      value={selected}
      onChange={handleChange}
      options={options}
      getOptionSelected={(option, value: HardwareProfile) => {
        return option.hwBoardId === value.hwBoardId;
      }}
      getOptionLabel={opt => opt?.hwBoardId ?? ''}
      renderInput={params => <TextField {...params} label={'Hardware'} />}
      noOptionsText="No hardware profiles"
    />
  );
}
