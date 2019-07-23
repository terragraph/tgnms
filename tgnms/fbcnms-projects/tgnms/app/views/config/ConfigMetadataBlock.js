/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import {ConfigConstraint} from '../../constants/ConfigConstants';
import {isPunctuation, toSentenceCase} from '../../helpers/StringHelpers';
import {isString} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
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
});

type Props = {
  classes: Object,
  metadata: Object,
  textClassName: ?string,
};

class ConfigMetadataBlock extends React.Component<Props, State> {
  renderDescription(metadata) {
    // Render the config field description
    const {classes, textClassName} = this.props;
    const {desc, deprecated, readOnly} = metadata;

    const description = desc
      ? desc + (isPunctuation(desc.slice(-1)) ? '' : '.')
      : 'n/a';

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
        <Typography className={textClassName}>{description}</Typography>
        <div className={classes.sectionSpacer} />
      </>
    );
  }

  renderAction(metadata) {
    // Render the post-config action
    const {classes, textClassName} = this.props;
    const {action} = metadata;

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

    return (
      <>
        <Typography
          variant="subtitle2"
          className={classNames(textClassName, classes.bold)}>
          Action
        </Typography>
        <Typography className={textClassName}>{actionContent}</Typography>
        <div className={classes.sectionSpacer} />
      </>
    );
  }

  renderConstraints(metadata) {
    // Render config field constraints (if any)
    const {classes, textClassName} = this.props;
    const {type, intVal, floatVal, strVal} = metadata;

    const constraints =
      type === 'INTEGER'
        ? intVal
        : type === 'FLOAT'
        ? floatVal
        : type === 'STRING'
        ? strVal
        : null;
    if (!constraints || Object.keys(constraints).length === 0) {
      return null;
    }

    return (
      <>
        <Typography
          variant="subtitle2"
          className={classNames(textClassName, classes.bold)}>
          Constraints
        </Typography>
        {Object.entries(constraints).map(([k, v]) => {
          const label = ConfigConstraint.hasOwnProperty(k)
            ? ConfigConstraint[k]
            : k;
          const values = isString(v)
            ? v
            : JSON.stringify(Array.isArray(v) && v.length === 1 ? v[0] : v);
          return (
            <Typography key={k} className={textClassName}>
              <em>{label}:</em> <tt>{values}</tt>
            </Typography>
          );
        })}
        <div className={classes.sectionSpacer} />
      </>
    );
  }

  render() {
    const {metadata} = this.props;

    return (
      <>
        {this.renderDescription(metadata)}
        {this.renderAction(metadata)}
        {this.renderConstraints(metadata)}
      </>
    );
  }
}

export default withStyles(styles)(ConfigMetadataBlock);
