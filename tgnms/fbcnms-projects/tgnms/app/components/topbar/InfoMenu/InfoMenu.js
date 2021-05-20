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
import MenuBookIcon from '@material-ui/icons/MenuBook';
import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import {getUIConfig} from '@fbcnms/tg-nms/app/common/uiConfig';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

const useStyles = makeStyles(theme => ({
  drawerListItem: {
    '@media (min-width: 600px)': {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
    },
  },
}));

export default function InfoMenu({drawerOpen}: {drawerOpen: boolean}) {
  const {version, env} = getUIConfig();
  const {COMMIT_DATE, COMMIT_HASH, DOC_URL} = env;
  const classes = useStyles();
  const {isOpen, open, close} = useModalState();

  const toggleBuildModal = React.useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return (
    <>
      {DOC_URL && (
        <Tooltip
          title="Help"
          placement="right"
          disableHoverListener={drawerOpen}
          disableFocusListener={true}
          disableTouchListener={false}>
          <ListItem
            component="a"
            href={DOC_URL}
            target="_blank"
            classes={{root: classes.drawerListItem}}
            button>
            <ListItemIcon>
              <MenuBookIcon />
            </ListItemIcon>
            <ListItemText primary="Help" />
          </ListItem>
        </Tooltip>
      )}
      {COMMIT_DATE && COMMIT_HASH && (
        <>
          <Tooltip
            title="About"
            placement="right"
            disableHoverListener={drawerOpen}
            disableFocusListener={true}
            disableTouchListener={false}>
            <ListItem
              classes={{root: classes.drawerListItem}}
              data-testid="toggle-about-modal"
              onClick={toggleBuildModal}
              button>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary="About" />
            </ListItem>
          </Tooltip>
          <BuildInformationModal
            buildInformationOpen={isOpen}
            toggleBuildModal={toggleBuildModal}
            version={version ?? ''}
            commitDate={COMMIT_DATE}
            commitHash={COMMIT_HASH}
          />
        </>
      )}
    </>
  );
}
