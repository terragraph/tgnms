/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import axios from 'axios';

import type {HardwareProfiles} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';

export async function getSchema(): Promise<Object> {
  const response = await axios.get('/hwprofile/schema');
  return response.data;
}

export async function getAllProfiles(): Promise<HardwareProfiles> {
  try {
    const response = await axios.get('/hwprofile');
    return response.data;
  } catch (err) {
    /**
     * This adds the default profile to the app as a separate chunk. If the
     * hwprofiles directory is not properly configured, the NMS will still have
     * some defaults in the UI.
     */
    const defaultProfileJSON = await import(
      // $FlowIgnore importing JSON from outside of flow root
      '../../../../../nms_stack/nms_cli/nms_stack/roles/hwprofiles/files/profiles/default.json'
    );
    return {
      default: defaultProfileJSON,
    };
  }
}
