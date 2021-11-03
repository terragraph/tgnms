/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import {useFolderPlans} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export type Props = {|
  folderId: string,
  planId: ?string,
  onChange: (planId: string) => void,
  disabled: boolean,
  id: string,
  hideLabel?: boolean,
|};

export default function SelectANPPlan({
  folderId,
  planId,
  onChange,
  disabled,
  id,
  hideLabel,
}: Props) {
  const autocompleteState = useModalState();
  const {plans, taskState: loadPlansTask} = useFolderPlans({folderId});
  const options = React.useMemo<Array<NetworkPlan>>(
    () => (plans != null ? plans : []),
    [plans],
  );
  const [plan, setPlan] = React.useState();
  React.useEffect(() => {
    if (plans != null && planId != null) {
      setPlan(plans.find(p => p.id === parseInt(planId)));
    }
  }, [planId, setPlan, plans]);
  return (
    <Autocomplete
      id={id}
      data-testid={`${id}-autocomplete`}
      size="small"
      open={autocompleteState.isOpen}
      onOpen={autocompleteState.open}
      onClose={autocompleteState.close}
      loading={loadPlansTask.isLoading}
      value={plan ?? null}
      onChange={(e, val) => {
        onChange(val.id);
      }}
      options={options}
      getOptionSelected={(option, value) => {
        return option.id === value.id;
      }}
      getOptionLabel={opt => opt?.name ?? ''}
      renderInput={params => (
        <TextField {...params} label={!hideLabel ? 'Select Plan' : null} />
      )}
      noOptionsText="No plans"
      disabled={disabled}
    />
  );
}
