/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import React from 'react';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import {CONFIG_CONSTRAINT} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {
  isPunctuation,
  toSentenceCase,
} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {isString} from 'lodash';
import {makeStyles} from '@material-ui/styles';

import type {ConfigMetaDataType} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
  sectionSpacer: {
    height: theme.spacing(),
  },
  bold: {
    fontWeight: 'bold',
  },
  red: {
    color: 'red',
  },
  grey: {
    color: 'grey',
  },
}));

type Props = {
  metadata: ConfigMetaDataType,
  textClassName?: string,
};

export default function ConfigMetadataBlock(props: Props) {
  const classes = useStyles();
  const {textClassName, metadata} = props;
  const {
    desc,
    deprecated,
    readOnly,
    action,
    type,
    intVal,
    floatVal,
    strVal,
  } = metadata;

  const description = desc
    ? desc + (isPunctuation(desc.slice(-1)) ? '' : '.')
    : 'n/a';

  const actionContent =
    action !== undefined ? (
      action === 'NO_ACTION' ? (
        'None'
      ) : (
        <>
          <em>{toSentenceCase(action)}</em> when changed.
        </>
      )
    ) : (
      'unknown'
    );

  const constraints =
    type === 'INTEGER'
      ? intVal
      : type === 'FLOAT'
      ? floatVal
      : type === 'STRING'
      ? strVal
      : null;

  return (
    <>
      {deprecated ? (
        <>
          <Typography
            variant="subtitle2"
            className={classNames(textClassName, classes.bold, classes.red)}>
            This field is deprecated!
          </Typography>
          <div className={classes.sectionSpacer} />
        </>
      ) : null}

      {readOnly ? (
        <>
          <Typography
            variant="subtitle2"
            className={classNames(textClassName, classes.bold, classes.grey)}>
            This field cannot be modified by users.
          </Typography>
          <div className={classes.sectionSpacer} />
        </>
      ) : null}

      <Typography
        variant="subtitle2"
        className={classNames(textClassName, classes.bold)}>
        Description
      </Typography>
      <Typography className={textClassName} variant="body2">
        {description}
      </Typography>
      <div className={classes.sectionSpacer} />

      <Typography
        variant="subtitle2"
        className={classNames(textClassName, classes.bold)}>
        Action
      </Typography>
      <Typography className={textClassName} variant="body2">
        {actionContent}
      </Typography>
      <div className={classes.sectionSpacer} />

      {constraints && Object.keys(constraints).length > 0 && (
        <>
          <Typography
            variant="subtitle2"
            className={classNames(textClassName, classes.bold)}>
            Constraints
          </Typography>
          {Object.entries(constraints).map(([k, v]) => {
            const label = CONFIG_CONSTRAINT.hasOwnProperty(k)
              ? CONFIG_CONSTRAINT[k]
              : k;
            const values = isString(v)
              ? String(v)
              : JSON.stringify(Array.isArray(v) && v.length === 1 ? v[0] : v);
            return (
              <Typography key={k} className={textClassName} variant="body2">
                <em>{label}:</em> <tt>{values}</tt>
              </Typography>
            );
          })}
          <div className={classes.sectionSpacer} />
        </>
      )}
    </>
  );
}
