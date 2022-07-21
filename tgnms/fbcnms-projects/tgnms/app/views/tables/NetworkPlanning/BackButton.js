/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
