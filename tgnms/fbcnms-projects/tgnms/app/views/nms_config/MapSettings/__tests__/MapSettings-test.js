/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import MapSettings from '../MapSettings';
import {
  DEFAULT_MAP_PROFILE,
  DEFAULT_MCS_TABLE,
} from '@fbcnms/tg-nms/app/constants/MapProfileConstants';
import {
  TestApp,
  coerceClass,
  getOptions,
  getSelectMenu,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render, within} from '@testing-library/react';
import type {MapProfile} from '@fbcnms/tg-nms/shared/dto/MapProfile';
import type {OverlayResponse} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';

jest.mock('@fbcnms/tg-nms/app/apiutils/MapAPIUtil');
import * as mapAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';

const MOCK_PROFILE_1 = {
  ...DEFAULT_MAP_PROFILE,
  name: 'test1',
  data: {
    ...DEFAULT_MAP_PROFILE.data,
    remoteOverlays: [
      {
        id: 'test',
        name: 'test',
        url: 'https://test.com/test',
        enabled: true,
        httpMethod: 'GET',
        useProxy: false,
      },
    ],
  },
};
const MOCK_PROFILE_2 = {
  ...DEFAULT_MAP_PROFILE,
  name: 'test2',
};
const getProfilesMock = jest
  .spyOn(mapAPIUtilMock, 'getProfiles')
  .mockResolvedValue([MOCK_PROFILE_1, MOCK_PROFILE_2]);
const createProfileMock = jest
  .spyOn(mapAPIUtilMock, 'createProfile')
  .mockImplementation((p: MapProfile) => Promise.resolve(p));
const deleteProfileMock = jest
  .spyOn(mapAPIUtilMock, 'deleteProfile')
  .mockResolvedValue(null);
const saveProfileMock = jest
  .spyOn(mapAPIUtilMock, 'saveProfile')
  .mockImplementation((p: MapProfile) => Promise.resolve(p));
const queryRemoteOverlayMock = jest
  .spyOn(mapAPIUtilMock, 'queryRemoteOverlay')
  .mockImplementation((p: OverlayResponse) => Promise.resolve(p));

test('renders', () => {
  const {getByText} = render(
    <Wrapper>
      <MapSettings />
    </Wrapper>,
  );
  expect(getByText(/map profiles/i)).toBeInTheDocument();
});

test('default profile is selected by default', () => {
  const {getByLabelText} = render(
    <Wrapper>
      <MapSettings />
    </Wrapper>,
  );
  const profileSelect = getByLabelText(/profiles/i);
  expect(profileSelect.textContent.toLowerCase()).toBe('default');
});

test('when the component mounts, loads the profiles', async () => {
  expect(getProfilesMock).not.toHaveBeenCalled();
  const {getByLabelText} = render(
    <Wrapper>
      <MapSettings />
    </Wrapper>,
  );
  expect(getProfilesMock).toHaveBeenCalled();
  const profileSelect = getByLabelText(/profiles/i);
  await act(async () => {
    fireEvent.mouseDown(profileSelect);
  });
  const menuItems = getOptions(getSelectMenu());
  expect(menuItems?.length).toBe(3); //2 profiles plus the default
});

describe('duplicate profile button', () => {
  test('clicking creates new profile', async () => {
    const {getByTestId} = await renderAsync(
      <Wrapper>
        <MapSettings />
      </Wrapper>,
    );
    await act(() => Promise.resolve());
    act(() => {
      fireEvent.click(getByTestId('duplicate-profile'));
    });
    expect(createProfileMock).toHaveBeenCalledWith({
      name: 'Default - Copy',
      data: {mcsTable: DEFAULT_MCS_TABLE, remoteOverlays: []},
    });
  });
});
describe('delete button', () => {
  test('delete button does not show for default profile', async () => {
    const {queryByTestId} = await renderAsync(
      <Wrapper>
        <MapSettings />
      </Wrapper>,
    );
    expect(queryByTestId('delete-profile')).not.toBeInTheDocument();
  });
  test('posts to delete api when clicked', async () => {
    const {getByTestId, getByLabelText} = await renderAsync(
      <Wrapper>
        <MapSettings />
      </Wrapper>,
    );
    const profileSelect = getByLabelText(/profiles/i);
    await act(async () => {
      fireEvent.mouseDown(profileSelect);
    });
    act(() => {
      selectMenuItem(getSelectMenu(), 'test1');
    });
    act(() => {
      fireEvent.click(getByTestId('delete-profile'));
    });
    expect(deleteProfileMock).toHaveBeenCalled();
  });
});

describe('MapSettings form', () => {
  test(
    'if default profile is selected' + 'submit and cancel buttons are disabled',
    async () => {
      const {getByTestId} = await renderAsync(
        <Wrapper>
          <MapSettings />
        </Wrapper>,
      );
      const cancelBtn = coerceClass(
        getByTestId('cancel-button'),
        HTMLButtonElement,
      );
      const submitBtn = coerceClass(
        getByTestId('submit-button'),
        HTMLButtonElement,
      );
      expect(cancelBtn.disabled).toBe(true);
      expect(submitBtn.disabled).toBe(true);
    },
  );
  test(
    'if a non-default profile is selected and form is non-dirty' +
      'submit and cancel buttons are still disabled',
    async () => {
      const {getByLabelText, getByTestId} = await renderAsync(
        <Wrapper>
          <MapSettings />
        </Wrapper>,
      );
      await selectProfileByName(getByLabelText(/profiles/i), 'test1');
      const cancelBtn = coerceClass(
        getByTestId('cancel-button'),
        HTMLButtonElement,
      );
      const submitBtn = coerceClass(
        getByTestId('submit-button'),
        HTMLButtonElement,
      );
      expect(cancelBtn.disabled).toBe(true);
      expect(submitBtn.disabled).toBe(true);
    },
  );
  test(
    'if a non-default profile form is dirty' +
      'submit and cancel buttons are enabled',
    async () => {
      const {getByLabelText, getByTestId} = await renderAsync(
        <Wrapper>
          <MapSettings />
        </Wrapper>,
      );
      await selectProfileByName(getByLabelText(/profiles/i), 'test1');
      const nameInput = coerceClass(getByLabelText(/name/i), HTMLInputElement);
      expect(nameInput.value).toBe('test1');
      act(() => {
        fireEvent.change(nameInput, {
          target: {value: 'test1-edited'},
        });
      });
      expect(nameInput.value).toBe('test1-edited');
      const cancelBtn = coerceClass(
        getByTestId('cancel-button'),
        HTMLButtonElement,
      );
      const submitBtn = coerceClass(
        getByTestId('submit-button'),
        HTMLButtonElement,
      );
      expect(cancelBtn.disabled).toBe(false);
      expect(submitBtn.disabled).toBe(false);
    },
  );
  test(
    'clicking the cancel button clears form changes and ' +
      'reverts back to default form',
    async () => {
      const {getByLabelText, getByTestId} = await renderAsync(
        <Wrapper>
          <MapSettings />
        </Wrapper>,
      );
      await selectProfileByName(getByLabelText(/profiles/i), 'test1');
      const nameInput = coerceClass(getByLabelText(/name/i), HTMLInputElement);
      expect(nameInput.value).toBe('test1');
      act(() => {
        fireEvent.change(nameInput, {
          target: {value: 'test1-edited'},
        });
      });
      expect(nameInput.value).toBe('test1-edited');

      act(() => {
        fireEvent.click(getByTestId('cancel-button'));
      });
      expect(nameInput.value).toBe('Default');
    },
  );
  test('submitting settings page posts to the save api', async () => {
    const {getByLabelText, getByTestId} = await renderAsync(
      <Wrapper>
        <MapSettings />
      </Wrapper>,
    );
    await selectProfileByName(getByLabelText(/profiles/i), 'test1');
    const nameInput = coerceClass(getByLabelText(/name/i), HTMLInputElement);
    expect(nameInput.value).toBe('test1');
    act(() => {
      fireEvent.change(nameInput, {
        target: {value: 'test1-edited'},
      });
    });
    expect(nameInput.value).toBe('test1-edited');

    expect(saveProfileMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(getByTestId('submit-button'));
    });
    expect(saveProfileMock).toHaveBeenCalled();
  });
});

describe('Remote overlays', () => {
  test('editor renders if selected profile has remote overlay', async () => {
    const {getByLabelText, getByText, getByTestId} = await renderAsync(
      <Wrapper>
        <MapSettings />
      </Wrapper>,
    );
    await selectProfileByName(getByLabelText(/profiles/i), 'test1');
    expect(getByText(/Remote Overlays/i)).toBeInTheDocument();
    expect(getByTestId('overlay-form-test')).toBeInTheDocument();
  });
  test('clicking test button submits overlay and network name to backend', async () => {
    const {getByLabelText, getByTestId} = await renderAsync(
      <TestApp route="/config/tower G/map">
        <MapSettings />
      </TestApp>,
    );
    await selectProfileByName(getByLabelText(/profiles/i), 'test1');
    const form = within(getByTestId('overlay-form-test'));
    const testBtn = form.getByText(/test/i);
    expect(testBtn).toBeInTheDocument();
    expect(queryRemoteOverlayMock).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(testBtn);
    });
    expect(queryRemoteOverlayMock).toHaveBeenCalledWith({
      network_name: 'tower G',
      overlay: {
        id: 'test',
        name: 'test',
        url: 'https://test.com/test',
        enabled: true,
        httpMethod: 'GET',
        useProxy: false,
      },
    });
  });
});

function Wrapper({children}) {
  return <TestApp>{children}</TestApp>;
}

function selectMenuItem(menu: ?HTMLElement, text: string) {
  if (!menu) {
    throw new Error('Menu is null');
  }
  const options = getOptions(menu);
  if (!options) {
    throw new Error('options not found');
  }
  const match = options.find(x => x.textContent === text);
  if (!match) {
    throw new Error(`menu item not found: ${text}`);
  }
  fireEvent.click(match);
}

async function selectProfileByName(el: HTMLElement, name: string) {
  await act(async () => {
    fireEvent.mouseDown(el);
  });
  act(() => {
    selectMenuItem(getSelectMenu(), name);
  });
}
