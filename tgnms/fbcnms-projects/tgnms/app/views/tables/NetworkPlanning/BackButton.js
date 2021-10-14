/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Button from '@material-ui/core/Button';
import React from 'react';
import {Link, generatePath, matchPath, useLocation} from 'react-router-dom';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';

type Props = {|
  from: string,
  to: string,
  label: string,
  'data-testid'?: string,
|};

export default function BackButton(props: Props) {
  const {from, to, label} = props;
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const {pathname} = useLocation();
  const backUrl = React.useMemo(() => {
    const match = matchPath(pathname, {
      path: from,
    });
    const newPath = generatePath(to, match?.params);
    return newPath;
  }, [from, to, pathname]);
  return (
    <Button
      data-testid={props['data-testid']}
      onClick={() => setSelectedPlanId(null)}
      component={Link}
      to={backUrl}
      size="small"
      color="primary"
      startIcon={<ArrowBackIcon fontSize="small" />}>
      {label}
    </Button>
  );
}
