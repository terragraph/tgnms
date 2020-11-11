/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios from 'axios';

import type {$AxiosError} from 'axios';
import type {
  OverlayRequest,
  OverlayResponse,
} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';

export async function makeOverlayRequest(
  req: OverlayRequest,
): Promise<OverlayResponse> {
  const apiURL = req?.overlay?.url;
  if (typeof apiURL !== 'string' || apiURL.trim() === '') {
    throw new Error('Invalid API Url');
  }

  try {
    const httpMethod = (req.overlay?.httpMethod ?? 'POST').toUpperCase();
    const response = await axios<OverlayRequest, OverlayResponse>({
      method: httpMethod,
      url: apiURL,
      params: {
        network_name: req.network_name,
      },
      data: req,
      timeout: 2000,
      proxy: req.overlay.useProxy ?? false,
    });
    return response.data;
  } catch (err) {
    console.error(err);
    if (err.response != null) {
      const axiosErr: $AxiosError<void> = err;
      console.error(axiosErr);
      return {
        type: 'error',
        error: {
          message: axiosErr?.response?.statusText ?? 'Axios HTTP Error',
        },
      };
    }
    return {
      type: 'error',
      error: {
        message: err.message,
      },
    };
  }
}
