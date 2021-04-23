/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import MapContext from '@fbcnms/tg-nms/app/contexts/MapContext';
import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import MomentUtils from '@date-io/moment';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import NmsOptionsContext from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import {CancelToken} from 'axios';
import {EMPTY_SETTINGS_STATE} from '@fbcnms/tg-nms/shared/dto/Settings';
import {FEATURE_FLAGS} from '@fbcnms/tg-nms/shared/FeatureFlags';
import {
  LINK_METRIC_OVERLAYS,
  SITE_METRIC_OVERLAYS,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {MuiPickersUtilsProvider} from '@material-ui/pickers';
import {Router} from 'react-router-dom';
import {Provider as RoutesContextProvider} from '@fbcnms/tg-nms/app/contexts/RouteContext';
import {Provider as SettingsFormContextProvider} from '@fbcnms/tg-nms/app/views/nms_config/SettingsFormContext';
import {SnackbarProvider} from 'notistack';
import {act, fireEvent, render} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {mockNetworkContext} from './data/NetworkContext';
import {mockNmsOptionsContext} from './data/NmsOptionsContext';

import type {
  EnvMap,
  SettingDefinition,
  SettingsState,
} from '@fbcnms/tg-nms/shared/dto/Settings';
import type {MapContext as MapContextType} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {MapboxDraw} from '@mapbox/mapbox-gl-draw';
import type {Map as MapboxMap} from 'react-mapbox-gl';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NmsOptionsContextType} from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import type {RenderOptionsWithoutCustomQueries} from '@testing-library/react';
import type {RenderResult} from '@testing-library/react';
import type {RouterHistory} from 'react-router-dom';
import type {RoutesContext} from '@fbcnms/tg-nms/app/contexts/RouteContext';
import type {UIConfig} from '@fbcnms/tg-nms/shared/dto/UI';
import type {User} from '@fbcnms/tg-nms/shared/auth/User';

// exports things like mockNetworkConfig and mockTopology
export * from './data/NetworkConfig';
export * from './data/NmsOptionsContext';
export * from './data/ANPTestData';

/**
 * DEPRECATED, pass a history object to TestApp instead.
 *
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
export function initWindowConfig(config?: $Shape<UIConfig>) {
  if (!window) {
    throw new Error(
      'window is undefined. Ensure that the current jest environment is jsdom',
    );
  }
  const emptyConf = {env: {}, featureFlags: {}};
  const defaults = Object.keys(FEATURE_FLAGS).reduce(
    (map, key) =>
      Object.assign(map, {
        [(key: string)]: FEATURE_FLAGS[key].isDefaultEnabled,
      }),
    {},
  );
  const conf = config ?? emptyConf;
  conf.featureFlags = {
    ...defaults,
    ...conf.featureFlags,
  };
  window.CONFIG = {...emptyConf, ...conf};
}

export function setTestUser(user: $Shape<User>) {
  window.CONFIG.user = user;
}

export function TestApp({
  children,
  route,
  history,
}: {
  children: React.Node,
  route?: string,
  history?: $Call<typeof createMemoryHistory>,
}) {
  const _history = React.useMemo(
    () => (history != null ? history : testHistory(route)),
    [history, route],
  );
  return (
    <Router history={_history}>
      <SnackbarWrapper>
        <MaterialTheme>{children}</MaterialTheme>
      </SnackbarWrapper>
    </Router>
  );
}

export function testHistory(route?: string) {
  return createMemoryHistory({initialEntries: [route || '/']});
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

export function RoutesContextWrapper({
  children,
  contextValue,
}: {
  children: React.Node,
  contextValue?: $Shape<RoutesContext>,
}) {
  return (
    <RoutesContextProvider
      node=""
      links={{}}
      nodes={new Set()}
      onUpdateRoutes={() => {}}
      resetRoutes={() => {}}
      {...contextValue}>
      {children}
    </RoutesContextProvider>
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
      alert_popups: false,
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
    mapProfiles: [],
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
        fallbackValue: '',
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

/*
 * Use this if a component needs a valid mapboxRef or
 * if a component is rendered in Mapbox Control.
 *
 * For example:
 *
 * const {__baseElement, ...mapboxRef} = mockMapboxRef();
 * const {getByTestId} = await render(
 *  <TestApp>
 *    <MapContextWrapper contextValue={{mapboxRef}}>
 *      <TgMapboxNavigation {...defaultProps} />
 *    </MapContextWrapper>
 *  </TestApp>,
 *  {container: document.body?.appendChild(__baseElement)},
 * );
 */
export function mockMapboxRef(): MapboxMap {
  const EventEmitter = require('events');
  const emitter = new EventEmitter();
  const baseElement = document.createElement('div');
  const images = new Map();

  const mapboxRef = {
    addControl: jest.fn<any, void>(({onAdd}) => {
      const control = onAdd(mapboxRef);
      baseElement.appendChild(control);
    }),
    removeControl: jest.fn<any, void>(({__el, onRemove}) => {
      onRemove(mapboxRef);
      baseElement.removeChild(__el);
    }),
    on: jest.fn<any, void>((eventId, callback) => {
      emitter.on(eventId, callback);
    }),
    off: jest.fn<any, void>((eventId, callback) => {
      emitter.off(eventId, callback);
    }),
    fire: jest.fn<any, void>((eventId, arg) => {
      emitter.emit(eventId, arg);
    }),
    loadImage: jest.fn<any, any>((path, cb) => cb(null, {})),
    addImage: jest.fn<any, any>((k, v) => images.set(k, v)),
    hasImage: jest.fn<any, any>(key => images.has(key)),
    triggerRepaint: jest.fn(),
    __baseElement: baseElement,
  };
  return mapboxRef;
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

export function mockMapboxDraw(
  overrides?: $Shape<MapboxDraw>,
): $Shape<MapboxDraw> {
  const el = document.createElement('div');
  el.setAttribute('data-testid', 'mapbox-gl-draw-mock');
  return {
    __el: el,
    onAdd: jest.fn(() => {
      return el;
    }),
    onRemove: jest.fn(),
    add: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn(),
    ...(overrides || {}),
  };
}

/**
 * Gets the menu for a <Select/> or <TextField select/> element.
 */
export function getSelectMenu(): ?HTMLElement {
  return document.querySelector(`[role="listbox"]`);
}

/**
 * Gets the menu option elements such as <MenuItem>.
 * Children of <Select/> or <TextField select/> element
 */
export function getOptions(el: ?HTMLElement): ?Array<HTMLElement> {
  return el ? [...el.querySelectorAll('[role="option"]')] : null;
}

export async function clickPanel(panel: HTMLElement) {
  act(() => {
    const btn = panel.querySelector('[role="button"]');
    if (!btn) {
      throw new Error('element not found');
    }
    fireEvent.click(btn);
  });
}
