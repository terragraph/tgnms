/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as scanAPI from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import EditIcon from '@material-ui/icons/Edit';
import ScanModal, {
  FULL_NETWORK_SCAN_OPTION,
  NETWORK_SCAN,
  createItem,
} from './ScanModal';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {
  MODAL_MODE,
  SCAN_MODE,
  SCAN_SERVICE_TYPES,
  SCAN_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

const useStyles = makeStyles(theme => ({
  editIcon: {
    marginRight: theme.spacing(),
  },
  editText: {
    textTransform: 'uppercase',
  },
}));

type Props = {
  id: number,
  type: $Keys<typeof SCAN_TYPES>,
  onActionClick: () => void,
  mode: $Keys<typeof SCAN_MODE>,
  initialCronString: string,
  tx_wlan_mac?: string,
};

export default function EditScanModal(props: Props) {
  const snackbars = useSnackbars();
  const classes = useStyles();
  const {id, onActionClick, type, mode, initialCronString} = props;
  const {networkName, nodeMap, macToNodeMap} = useNetworkContext();

  // Figure out what the current item selection is (network or radio).
  let currentItem;
  if (props.tx_wlan_mac) {
    const mac = props.tx_wlan_mac;
    currentItem = createItem(mac, nodeMap[macToNodeMap[mac]]);
  } else {
    currentItem = {
      title: networkName,
      ...FULL_NETWORK_SCAN_OPTION,
    };
  }

  const formProps = useForm({
    initialState: {
      type: type,
      mode: mode,
      item: currentItem,
    },
  });

  const {formState} = formProps;
  const handleSubmit = React.useCallback(
    (cronExpr: ?string, _adhoc: boolean) => {
      if (!cronExpr) {
        return;
      }
      const options = {};
      if (formState.item.value !== NETWORK_SCAN) {
        options['tx_wlan_mac'] = formState.item.value;
      }
      scanAPI
        .editScanSchedule({
          inputData: {
            cronExpr,
            networkName,
            type: SCAN_TYPES[formState.type],
            mode: SCAN_MODE[formState.mode],
            options: options,
          },
          scheduleId: id,
        })
        .then(_ => snackbars.success('Successfully edited scan schedule!'))
        .catch(err =>
          snackbars.error('Failed to edit scan schedule: ' + err.message),
        );
      onActionClick();
    },
    [id, networkName, onActionClick, formState, snackbars],
  );

  const modalProps = {
    buttonTitle: (
      <>
        <EditIcon className={classes.editIcon} />{' '}
        <span className={classes.editText}>edit</span>
      </>
    ),
    modalTitle: 'Edit Scan Schedule',
    modalScheduleText: 'Save Changes',
    onSubmit: handleSubmit,
    type: SCAN_SERVICE_TYPES[formState.type],
    modalMode: MODAL_MODE.EDIT,
    initialCronString: initialCronString,
  };
  return <ScanModal {...{modalProps, formProps}} />;
}
