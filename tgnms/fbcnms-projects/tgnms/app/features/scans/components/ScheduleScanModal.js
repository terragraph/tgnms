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
import * as scanApi from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import ScanModal, {FULL_NETWORK_SCAN_OPTION, NETWORK_SCAN} from './ScanModal';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {
  DEFAULT_SCAN_MODE,
  MODAL_MODE,
  SCAN_MODE,
  SCAN_SERVICE_TYPES,
  SCAN_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

type Props = {onActionClick: () => void};

export default function ScheduleScanModal(props: Props) {
  const snackbars = useSnackbars();
  const {networkName} = useNetworkContext();
  const scheduleTypes = Object.keys(SCAN_SERVICE_TYPES);
  const {onActionClick} = props;

  const formProps = useForm({
    initialState: {
      type: scheduleTypes[0],
      mode: DEFAULT_SCAN_MODE,
      item: {title: networkName, ...FULL_NETWORK_SCAN_OPTION},
    },
  });

  const {formState} = formProps;
  const handleSubmit = React.useCallback(
    (cronExpr: ?string, adhoc: boolean) => {
      const options = {};
      if (formState.item.value !== NETWORK_SCAN) {
        options['tx_wlan_mac'] = formState.item.value;
      }
      if (cronExpr) {
        scanApi
          .scheduleScan({
            cronExpr,
            type: SCAN_TYPES[formState.type],
            networkName,
            mode: SCAN_MODE[formState.mode],
            options: options,
          })
          .then(_ => {
            snackbars.success('Successfully scheduled scan!');
          })
          .catch(err => snackbars.error('Failed to schedule scan: ' + err));
      }
      if (adhoc) {
        scanApi
          .startExecution({
            type: SCAN_TYPES[formState.type],
            networkName,
            mode: SCAN_MODE[formState.mode],
            options: options,
          })
          .then(_ => snackbars.success('Successfully started scan!'))
          .catch(err => snackbars.error('Failed to start scan: ' + err));
      }
      onActionClick();
    },
    [networkName, formState, onActionClick, snackbars],
  );

  const modalProps = {
    buttonTitle: 'Schedule Scan',
    modalTitle: 'Schedule Scan',
    modalSubmitText: 'Start Scan',
    modalScheduleText: 'Schedule Scan',
    onSubmit: handleSubmit,
    type: SCAN_SERVICE_TYPES[formState.type],
    modalMode: MODAL_MODE.CREATE,
  };
  return <ScanModal {...{modalProps, formProps}} />;
}
