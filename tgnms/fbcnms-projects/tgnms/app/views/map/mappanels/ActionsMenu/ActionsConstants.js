/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import typeof SvgIcon from '@material-ui/core/@@SvgIcon';
import type {Theme} from '@material-ui/core/styles';

export const styles = (theme: Theme) => ({
  actionsButton: {
    textAlign: 'center',
  },
  actionCategoryDivider: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  menuItem: {
    paddingLeft: theme.spacing(2),
  },
});

export type ActionOptions = {
  actionItems: ActionGroup[],
  buttonClassName?: string,
  buttonName?: string,
};

export type ActionGroup = {
  actions: Array<ActionItem>,
  heading?: string,
  isDisabled?: boolean,
};

export type ActionItem = {|
  label: string,
  icon?: React.Element<SvgIcon>,
  func?: () => *,
  component?: React.ComponentType<*>,
  isDisabled?: boolean,
  'data-testid'?: string,
  className?: string,
  subMenu?: ActionGroup[],
|};
