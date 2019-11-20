/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import MaterialTheme from '../MaterialTheme';
import MomentUtils from '@date-io/moment';
import NetworkContext from '../NetworkContext';
import i18next from 'i18next';
import {MuiPickersUtilsProvider} from '@material-ui/pickers';
import {Router} from 'react-router-dom';
import {act, render} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {initReactI18next} from 'react-i18next';
import {mockNetworkContext} from './data/NetworkContext';
import type {NetworkContextType} from '../NetworkContext';
import type {User} from '../../shared/auth/User';

// exports things like mockNetworkConfig and mockTopology
export * from './data/NetworkConfig';

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
  }: {route?: string, history?: any} = {},
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

export function TestApp({children}: {children: React.Node}) {
  i18next.use(initReactI18next).init({});
  return <MaterialTheme>{children}</MaterialTheme>;
}

export function MuiPickersWrapper({children}: {children: React.Node}) {
  return (
    <MuiPickersUtilsProvider utils={MomentUtils}>
      {children}
    </MuiPickersUtilsProvider>
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
    <NetworkContext.Provider value={mockNetworkContext(contextValue)}>
      {children}
    </NetworkContext.Provider>
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
export async function renderAsync(...renderArgs: Array<any>): Promise<any> {
  let result;
  await act(async () => {
    result = await render(...renderArgs);
  });
  return result;
}
