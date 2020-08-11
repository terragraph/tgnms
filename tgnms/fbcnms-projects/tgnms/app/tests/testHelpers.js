/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import MapContext from '../contexts/MapContext';
import MaterialTheme from '../MaterialTheme';
import MomentUtils from '@date-io/moment';
import NetworkContext from '../contexts/NetworkContext';
import NmsOptionsContext from '../contexts/NmsOptionsContext';
import {CancelToken} from 'axios';
import {EMPTY_SETTINGS_STATE} from '../../shared/dto/Settings';
import {
  LINK_METRIC_OVERLAYS,
  SITE_METRIC_OVERLAYS,
} from '../constants/LayerConstants';
import {MuiPickersUtilsProvider} from '@material-ui/pickers';
import {Router} from 'react-router-dom';
import {Provider as SettingsFormContextProvider} from '../views/nms_config/SettingsFormContext';
import {SnackbarProvider} from 'notistack';
import {act, render} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {mockNetworkContext} from './data/NetworkContext';
import {mockNmsOptionsContext} from './data/NmsOptionsContext';
import type {
  EnvMap,
  SettingDefinition,
  SettingsState,
} from '../../shared/dto/Settings';
import type {MapContext as MapContextType} from '../contexts/MapContext';
import type {NetworkContextType} from '../contexts/NetworkContext';
import type {NmsOptionsContextType} from '../contexts/NmsOptionsContext';
import type {PanelStateControl} from '../components/mappanels/usePanelControl';
import type {RenderOptionsWithoutCustomQueries} from '@testing-library/react';
import type {RenderResult} from '@testing-library/react';
import type {RouterHistory} from 'react-router-dom';
import type {User} from '../../shared/auth/User';

// exports things like mockNetworkConfig and mockTopology
export * from './data/NetworkConfig';
export * from './data/NmsOptionsContext';

/**
 * wraps a component with a router instance, pass {route:'/myroute'} to set the
 * current url
 */
export function renderWithRouter(
  ui: React.Node,
  {
    route = '/',
    history = createMemoryHistory({initialEntries: [route]}),
    ...renderArgs //arguments specific to @testing-library/react.render
  }: {|
    route?: string,
    history?: RouterHistory,
    ...RenderOptionsWithoutCustomQueries,
  |} = {},
) {
  return {
    ...render(<Router history={history}>{ui}</Router>, renderArgs),
    history,
  };
}

// TGNMS renders json into the dom and loads it into window.CONFIG
export function initWindowConfig(config: any = {env: {}}) {
  if (!window) {
    throw new Error(
      'window is undefined. Ensure that the current jest environment is jsdom',
    );
  }
  window.CONFIG = config;
}

export function setTestUser(user: $Shape<User>) {
  window.CONFIG.user = user;
}

export function TestApp({
  children,
  route,
}: {
  children: React.Node,
  route?: string,
}) {
  return (
    <Router history={createMemoryHistory({initialEntries: [route || '/']})}>
      <SnackbarWrapper>
        <MaterialTheme>{children}</MaterialTheme>
      </SnackbarWrapper>
    </Router>
  );
}

export function MuiPickersWrapper({children}: {children: React.Node}) {
  return (
    <MuiPickersUtilsProvider utils={MomentUtils}>
      {children}
    </MuiPickersUtilsProvider>
  );
}

export function ScheduleNetworkTestModalWrapper({
  children,
}: {
  children: React.Node,
}) {
  return (
    <SnackbarWrapper>
      <MuiPickersWrapper>
        <NetworkContextWrapper contextValue={{networkName: 'testNetworkName'}}>
          {children}
        </NetworkContextWrapper>
      </MuiPickersWrapper>
    </SnackbarWrapper>
  );
}

export function NetworkContextWrapper({
  children,
  contextValue,
}: {
  children: React.Node,
  contextValue?: $Shape<NetworkContextType>,
}) {
  return (
    <SnackbarWrapper>
      <NetworkContext.Provider value={mockNetworkContext(contextValue)}>
        {children}
      </NetworkContext.Provider>
    </SnackbarWrapper>
  );
}

export function SnackbarWrapper({children}: {children: React.Node}) {
  return <SnackbarProvider>{children}</SnackbarProvider>;
}

export function NmsOptionsContextWrapper({
  children,
  contextValue,
}: {
  children: React.Node,
  contextValue?: $Shape<NmsOptionsContextType>,
}) {
  return (
    <NmsOptionsContext.Provider value={mockNmsOptionsContext(contextValue)}>
      {children}
    </NmsOptionsContext.Provider>
  );
}

export function MapContextWrapper({
  contextValue,
  children,
}: {|
  children: React.Node,
  contextValue?: $Shape<MapContextType>,
|}) {
  const val: MapContextType = {
    mapMode: '',
    setMapMode: jest.fn(),
    selectedLayers: {
      link_lines: true,
      site_icons: true,
      buildings_3d: true,
      site_name_popups: true,
    },
    setIsLayerSelected: jest.fn(),
    overlaysConfig: {},
    setOverlaysConfig: jest.fn(),
    selectedOverlays: {
      link_lines: 'ignition_status',
      site_icons: 'health',
    },
    setLayerOverlay: jest.fn(),
    setSelectedOverlays: jest.fn(),
    overlays: {
      link_lines: LINK_METRIC_OVERLAYS.ignition_status,
      site_icons: SITE_METRIC_OVERLAYS.health,
    },
    overlayData: {},
    setOverlayData: jest.fn(),
    isOverlayLoading: false,
    setIsOverlayLoading: jest.fn(),
    ...(contextValue || {}: $Shape<MapContextType>),
  };
  return <MapContext.Provider value={val}>{children}</MapContext.Provider>;
}

export function SettingsFormContextWrapper({
  children,
  settings,
  values,
  settingsState,
}: {
  children: React.Node,
  settings?: Array<SettingDefinition>,
  values?: EnvMap,
  settingsState?: ?SettingsState,
}) {
  const settingLookup = React.useMemo(
    () =>
      (settings ? settings : []).reduce<{[string]: SettingDefinition}>(
        (map, s) => ({...map, [s.key]: s}),
        {},
      ),
    [settings],
  );
  return (
    <SettingsFormContextProvider
      getInput={k => ({
        config: settingLookup[k],
        value: values ? values[k] : '',
        isOverridden: false,
        onChange: jest.fn(),
      })}
      formState={values || {}}
      settingsState={settingsState || EMPTY_SETTINGS_STATE}>
      {children}
    </SettingsFormContextProvider>
  );
}

/*
 * Use this if a component asyncronously loads data when it is rendered.
 *
 * For example:
 *
 * function MyComponent(){
 *  const [data, setData] = useState(null);
 *  useEffect(() => {
 *    axios.get().then(response => {
 *      setData(response.data)
 *    })
 *  }, []);
 *  return <div>{data}</div>
 * }
 *
 * since the setData call happens asyncronously, react test renderer will
 * complain that you've modified state outside of an act() call.
 *
 * if your component needs to load data asyncronously on mount, replace:
 *
 * const {getByText} = render(<MyComponent/>);
 * with
 * const {getByText} = await renderAsync(<MyComponent/>);
 */
export async function renderAsync(
  ...renderArgs: Array<any>
): Promise<RenderResult<>> {
  let result;
  await act(async () => {
    result = await render(...renderArgs);
  });
  if (result) {
    return result;
  } else {
    throw new Error();
  }
}

export function cast<T>(x: any): T {
  return (x: T);
}

export function coerceClass<T>(value: {} | void | null, t: Class<T>): T {
  if (value instanceof t) {
    return value;
  }
  throw new Error('invalid instance type');
}

/**
 * Creates a fake CancelToken
 */
export function mockCancelToken(): CancelToken {
  return (({
    constructor: () => null,
    source: () => {},
    promise: new Promise<null>(() => null),
    throwIfRequested: () => null,
  }: any): CancelToken);
}

export function mockPanelControl(
  overrides?: $Shape<PanelStateControl> = {},
): PanelStateControl {
  return {
    getAll: jest.fn(),
    getIsHidden: jest.fn(() => true),
    getIsCollapsed: jest.fn(() => false),
    getIsOpen: jest.fn(() => false),
    getPanelState: jest.fn(),
    toggleOpen: jest.fn(),
    setPanelState: jest.fn(),
    removePanel: jest.fn(),
    collapseAll: jest.fn(),
    ...overrides,
  };
}

/**
 * CustomAccordion has the data-test-expanded attr to aid in testing.
 * This reads that attr and converts it to a bool.
 */
export function getIsExpanded(el: HTMLElement): boolean {
  const attr = el.getAttribute('data-test-expanded');
  if (!attr || attr.trim() === '') {
    return false;
  }
  if (attr === 'true') {
    return true;
  }
  if (attr === 'false') {
    return false;
  }
  return !!attr;
}
