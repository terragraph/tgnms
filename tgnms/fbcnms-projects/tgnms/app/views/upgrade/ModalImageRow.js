/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

import * as React from 'react';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import RootRef from '@material-ui/core/RootRef';
import {getVersion, getVersionNumber} from '../../helpers/VersionHelper';
import {makeStyles} from '@material-ui/styles';
import type {SoftwareImageType} from '../../helpers/UpgradeHelpers';

type Props = {|
  image: SoftwareImageType,
  menuItems: Array<React.Node>,
|};

const useStyles = makeStyles(theme => ({
  avatar: {
    fontSize: '1rem',
    padding: 2,
    backgroundColor: theme.palette.primary.light,
  },
}));

export default function ModelImageRow(props: Props) {
  const classes = useStyles();
  // Render a list-item row for the given image
  const {image, menuItems} = props;
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const iconButtonRef = React.useRef(null);

  const versionNumber =
    image.versionNumber != null
      ? image.versionNumber
      : getVersionNumber(getVersion(image.name));

  return (
    <React.Fragment key={image.name}>
      <ListItem>
        <ListItemAvatar>
          <Avatar className={classes.avatar}>
            {versionNumber.replace('M', '')}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={image.name}
          secondary={
            <>
              {image.hardwareBoardIds && image.hardwareBoardIds.length > 0 ? (
                <span>
                  <strong>Boards:</strong> {image.hardwareBoardIds.join(', ')}
                </span>
              ) : null}
              {image.uploadedDate && (
                <span>Uploaded: {image.uploadedDate.toLocaleString()}</span>
              )}
            </>
          }
        />
        <ListItemSecondaryAction>
          <RootRef rootRef={iconButtonRef}>
            <IconButton
              onClick={() => setMenuOpen(true)}
              data-testid="open-menu">
              <MoreVertIcon />
            </IconButton>
          </RootRef>
        </ListItemSecondaryAction>
      </ListItem>
      <Menu
        anchorEl={iconButtonRef.current}
        open={isMenuOpen}
        onClose={() => setMenuOpen(false)}>
        {/**
          the menuItems' onclicks are handled outside of this component
          but we still want to handle the menu from within here
        */}
        {React.Children.map(menuItems, child =>
          React.cloneElement(child, {
            onClick: () => {
              child.props.onClick && child.props.onClick(image);
              setMenuOpen(false);
            },
          }),
        )}
      </Menu>
    </React.Fragment>
  );
}
