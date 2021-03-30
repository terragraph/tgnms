/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import {makeStyles} from '@material-ui/styles';

export type Props = {
  title: string,
  children: React.Element<*>,
  enabled: boolean,
};

export type State = {
  copySuccessful: boolean,
};

const useSummaryStyles = makeStyles(_theme => ({
  copyButton: {
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  hiddenTextArea: {
    position: 'absolute',
    left: '-9999px',
    height: 0,
    width: 0,
  },
}));

export default function ClipboardTooltip(props: Props) {
  const {title, children, enabled} = props;
  const classes = useSummaryStyles();
  const selectionRef = React.useRef<?HTMLTextAreaElement>();
  const [state, setState] = React.useState<State>({
    copySuccessful: false,
  });
  const handleCopyButtonClick = React.useCallback(
    e => {
      e.stopPropagation();
      if (selectionRef.current) {
        selectionRef.current.select();
        setState({copySuccessful: document.execCommand('copy')});
      }
    },
    [setState, selectionRef],
  );

  if (!enabled) {
    return children;
  }
  return (
    <Tooltip
      title={
        <React.Fragment>
          <span>{title}</span>
          <span> - </span>
          <a
            className={classes.copyButton}
            onClick={handleCopyButtonClick}
            role="button">
            {state.copySuccessful ? 'Copied!' : 'Click to copy'}
            <textarea
              className={classes.hiddenTextArea}
              aria-hidden="true"
              ref={selectionRef}
              value={title}
              readOnly
            />
          </a>
        </React.Fragment>
      }
      enterDelay={500}
      leaveDelay={state.copySuccessful ? 200 : 1000}
      interactive
      onClose={() => setState({copySuccessful: false})}
      placement="top-start">
      {children}
    </Tooltip>
  );
}
