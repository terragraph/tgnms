/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {FormType} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';

import type {
  EditLinkParams,
  EditNodeParams,
} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {SiteType} from '@fbcnms/tg-nms/shared/types/Topology';

export type EditTopologyElementParams =
  | $Shape<EditNodeParams>
  | EditLinkParams
  | $Shape<SiteType>;

export type PanelForm<T> = {|
  params: ?T,
  formType: $Values<typeof FormType>,
|};

export type TopologyBuilderState<T> = {
  ...PanelForm<T>,
  updateForm: (x: $Shape<PanelForm<T>>) => void,
};

export default function useTopologyBuilderForm<T>(): TopologyBuilderState<T> {
  const [{params, formType}, setFormState] = React.useState<
    $Shape<PanelForm<T>>,
  >({
    params: null,
    formType: FormType.CREATE,
  });
  const updateform = React.useCallback(
    (update: $Shape<PanelForm<T>>) => {
      setFormState(curr => ({
        ...curr,
        ...update,
      }));
    },
    [setFormState],
  );

  return {
    params: params,
    formType: formType,
    updateForm: updateform,
  };
}
