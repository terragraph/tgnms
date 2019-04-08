/**
 * Basic flow type for a user shared by client and backend
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Array<string>;
}
