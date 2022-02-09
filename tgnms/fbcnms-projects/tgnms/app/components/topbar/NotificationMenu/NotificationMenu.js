/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Notification menu designed to show notifications from multiple sources.
 * Currently only shows kafka events.
 */

import * as React from 'react';
import NotificationsIcon from '@material-ui/icons/Notifications';
import RootRef from '@material-ui/core/RootRef';

import Badge from '@material-ui/core/Badge';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import ErrorIcon from '@material-ui/icons/Error';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import InfoIcon from '@material-ui/icons/Info';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import NotificationDialog from './NotificationDialog';
import Typography from '@material-ui/core/Typography';
import WarningIcon from '@material-ui/icons/Warning';
import grey from '@material-ui/core/colors/grey';
import orange from '@material-ui/core/colors/orange';
import red from '@material-ui/core/colors/red';
import yellow from '@material-ui/core/colors/yellow';
import {EventLevelValueMap} from '@fbcnms/tg-nms/shared/types/Event';
import {makeStyles} from '@material-ui/styles';
import {useWebSocketGroup} from '@fbcnms/tg-nms/app/contexts/WebSocketContext';
import type {EventType} from '@fbcnms/tg-nms/shared/types/Event';

import {NOTIFICATION_SOURCE} from './constants';
import type {NotificationMenuItem} from './constants';

const useStyles = makeStyles(theme => ({
  menuIcon: {
    padding: theme.spacing(2),
  },
  menu: {
    width: 400,
    minWidth: 400,
  },
  clearNotificationsButton: {
    padding: theme.spacing(),
    marginRight: -(theme.spacing() + 4),
  },
  menuItemText: {
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
  },
  listItemText: {
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: 0,
    display: 'inline-block',
  },
  listItemIcon: {
    marginRight: theme.spacing(2),
    minWidth: 'unset',
  },
}));

export default function NotificationMenu() {
  const classes = useStyles();
  const iconButtonRef = React.useRef(null);
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const {
    notifications,
    addNotification,
    clearNotifications,
  } = useNotificationStack();
  const [showBadge, setShowBadge] = React.useState(false);
  /*
   * decorate addNotification to show a badge when a new notification
   * arrives while the menu is closed.
   */
  const addNotificationShowBadge = React.useCallback(
    notification => {
      if (!isMenuOpen) {
        setShowBadge(true);
      }
      return addNotification(notification);
    },
    [isMenuOpen, addNotification],
  );
  useKafkaNotificationSource({addNotification: addNotificationShowBadge});
  const [selectedNotification, selectNotification] = React.useState(null);

  return (
    <>
      <RootRef rootRef={iconButtonRef}>
        <IconButton
          color="inherit"
          className={classes.menuIcon}
          onClick={() => {
            setMenuOpen(open => !open);
            setShowBadge(false);
          }}
          title="Notification Menu Toggle"
          aria-owns={isMenuOpen ? 'notification-menu' : undefined}
          aria-haspopup="true"
          data-testid="menu-toggle">
          <Badge
            color="secondary"
            variant="dot"
            invisible={!showBadge}
            /*
             * data-test-invisible and data-testid are for querying
             * the state of the popup during testing
             */
            data-test-invisible={!showBadge}
            data-testid="badge">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </RootRef>
      <Menu
        classes={{paper: classes.menu}}
        open={isMenuOpen}
        onClose={() => setMenuOpen(false)}
        anchorEl={iconButtonRef.current}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        id="notification-menu"
        data-testid="notification-menu"
        MenuListProps={{
          /*
           * fixes a bug which causes the clear notifications button to
           * push outside of the container
           */
          style: {
            width: '100%',
          },
          subheader: (
            <ListSubheader disableSticky>
              <Grid container alignItems="center">
                <Grid item xs={6}>
                  Recent Events
                </Grid>
                <Grid container item justifyContent="flex-end" xs={6}>
                  <IconButton
                    onClick={clearNotifications}
                    className={classes.clearNotificationsButton}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </ListSubheader>
          ),
        }}>
        {notifications.length === 0 && (
          <ListItem>
            <Typography color="textSecondary" data-testid="no-events-message">
              No events to show
            </Typography>
          </ListItem>
        )}
        {notifications.map(notification => (
          <MenuItem
            key={notification.key}
            onClick={() => selectNotification(notification)}
            title="Show Details">
            <ListItemIcon className={classes.listItemIcon}>
              {notification.Icon}
            </ListItemIcon>
            <ListItemText
              className={classes.menuItemText}
              primary={notification.primaryText}
              secondary={notification.secondaryText}
              primaryTypographyProps={{
                className: classes.listItemText,
              }}
              secondaryTypographyProps={{
                className: classes.listItemText,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
      <NotificationDialog
        notification={selectedNotification}
        onClose={() => selectNotification(null)}
      />
    </>
  );
}

// size-limited stack of notifications to render
export function useNotificationStack({limit}: {limit?: number} = {limit: 100}) {
  const [notifications, setNotifications] = React.useState<
    Array<NotificationMenuItem>,
  >([]);
  return React.useMemo(
    () => ({
      notifications,
      addNotification: (notification: NotificationMenuItem) =>
        setNotifications(
          [notification]
            .concat(notifications)
            .slice(0, typeof limit === 'number' ? limit : 100),
        ),
      clearNotifications: () => setNotifications([]),
    }),
    [limit, notifications, setNotifications],
  );
}

function useKafkaNotificationSource({addNotification}) {
  const networkListContext = React.useContext(NetworkListContext);
  useWebSocketGroup('events', ({payload}) => {
    try {
      const currentTopology = networkListContext.getNetworkName();
      const kafkaValue: EventType = JSON.parse(payload.value);

      /*
       * Only show the notifications which originated from the current topology.
       * Filtering is clientside only for now.
       */
      if (
        kafkaValue.topologyName !== currentTopology &&
        typeof kafkaValue.topologyName === 'string' &&
        kafkaValue.topologyName !== ''
      ) {
        return;
      }

      const timeString =
        payload.timestamp && new Date(payload.timestamp).toLocaleTimeString();
      const notification = {
        key: payload.offset,
        primaryText: kafkaValue.reason,
        secondaryText: `${
          kafkaValue.nodeName || kafkaValue.nodeId || 'unknown'
        } • ${timeString}`,
        details: kafkaValue,
        source: NOTIFICATION_SOURCE.EVENTS_KAFKA,
        data: payload,
        Icon: <EventLevelIcon level={kafkaValue.level} />,
      };
      addNotification(notification);
    } catch (err) {}
  });
}

type LevelProps = {|
  level: $Values<typeof EventLevelValueMap>,
|};

const useIconStyles = makeStyles(() => ({
  icon: {
    color: ({color}) => color,
  },
}));
function EventLevelIcon({level, ...props}: LevelProps) {
  const iconMap = React.useMemo(
    () => ({
      [EventLevelValueMap.INFO]: {
        icon: props => <InfoIcon title="Level: Info" {...props} />,
        color: grey[300],
      },
      [EventLevelValueMap.WARNING]: {
        icon: props => <WarningIcon title="Level: Warning" {...props} />,
        color: yellow[300],
      },
      [EventLevelValueMap.ERROR]: {
        icon: props => <ErrorOutlineIcon title="Level: Error" {...props} />,
        color: orange[300],
      },
      [EventLevelValueMap.FATAL]: {
        icon: props => <ErrorIcon title="Level: Fatal" {...props} />,
        color: red[300],
      },
    }),
    [],
  );
  const {icon: Icon, color} =
    iconMap[level] || iconMap[EventLevelValueMap.INFO];
  const classes = useIconStyles({color});
  return <Icon className={classes.icon} {...props} />;
}
