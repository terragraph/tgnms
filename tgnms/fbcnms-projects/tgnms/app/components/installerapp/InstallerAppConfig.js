/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import FBCMobileAppConfigView from '@fbcnms/mobileapp/FBCMobileAppConfigView';
import MaterialModal from '../../components/common/MaterialModal';

type Props = {
  children: React.Node,
};

export default function InstallerAppConfig(props: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)} {...props} />
      <MaterialModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        modalTitle="Mobile App Setup"
        modalContent={
          <FBCMobileAppConfigView endpoint="/mobileapp/clientconfig" />
        }
      />
    </>
  );
}
