/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import BuildInformationModal from '@fbcnms/tg-nms/app/components/topbar/InfoMenu/BuildInformationModal';
import InfoIcon from '@material-ui/icons/Info';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import {getUIConfig} from '@fbcnms/tg-nms/app/common/uiConfig';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

const useStyles = makeStyles(theme => ({
  tooltip: {
    bottom: 0,
    position: 'absolute',
  },
  drawerListItem: {
    '@media (min-width: 600px)': {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
    },
  },
}));

export default function InfoMenu({drawerOpen}: {drawerOpen: boolean}) {
  const anchorEl = React.useRef<?HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleClick = React.useCallback(_ => {
    setIsMenuOpen(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const {version, env} = getUIConfig();
  const {COMMIT_DATE, COMMIT_HASH, DOC_URL} = env;
  const classes = useStyles();
  const {isOpen, open, close} = useModalState();

  const toggleBuildModal = React.useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
      handleClose();
    }
  }, [isOpen, open, close, handleClose]);

  return (
    <>
      <Tooltip
        className={classes.tooltip}
        title="Help"
        placement="right"
        disableHoverListener={drawerOpen}
        disableFocusListener={true}
        disableTouchListener={false}>
        <ListItem
          ref={(anchorEl: any)}
          classes={{root: classes.drawerListItem}}
          data-testid="toggle-help-menu"
          onClick={handleClick}
          button>
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <ListItemText primary="Help" />
        </ListItem>
      </Tooltip>
      <Menu
        id="help-menu"
        anchorEl={anchorEl.current}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'left'}}
        open={isMenuOpen}
        onClose={handleClose}>
        {DOC_URL && (
          <MenuItem onClick={handleClose}>
            <ListItem component="a" href={DOC_URL} target="_blank">
              <ListItemText primary="NMS Documentation" />
            </ListItem>
          </MenuItem>
        )}
        {COMMIT_DATE && COMMIT_HASH && (
          <MenuItem
            data-testid="toggle-about-modal"
            key="about"
            onClick={toggleBuildModal}>
            <ListItem>
              <ListItemText primary="About" />
            </ListItem>
          </MenuItem>
        )}
      </Menu>
      <BuildInformationModal
        buildInformationOpen={isOpen}
        toggleBuildModal={toggleBuildModal}
        version={version ?? ''}
        commitDate={COMMIT_DATE}
        commitHash={COMMIT_HASH}
      />
    </>
  );
}