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
import type {LocationShape} from 'react-router-dom';

type Props = {|
  from: string,
  to: string,
  label: string,
  keepSelectedPlan?: boolean,
  'data-testid'?: string,
|};

export default function BackButton(props: Props) {
  const {from, to, label, keepSelectedPlan} = props;
  const {pathname, search} = useLocation();
  const backUrl = React.useMemo<LocationShape>(() => {
    const match = matchPath(pathname, {
      path: from,
    });
    const newPath = generatePath(to, match?.params);
    return {
      pathname: newPath,
      search: keepSelectedPlan === true ? search : '',
    };
  }, [from, to, search, pathname, keepSelectedPlan]);
  return (
    <Button
      data-testid={props['data-testid']}
      component={Link}
      to={backUrl}
      size="small"
      color="primary"
      startIcon={<ArrowBackIcon fontSize="small" />}>
      {label}
    </Button>
  );
}
