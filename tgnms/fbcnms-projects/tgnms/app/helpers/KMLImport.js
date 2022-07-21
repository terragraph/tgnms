/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function parseAndCleanKML(kmlText: string): Document {
  const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
  // remove the styles in xml because kml parser fails with style tags
  const Styles = kml.getElementsByTagName('Style');
  [].forEach.call(Styles, style => {
    style.parentNode.removeChild(style);
  });
  const StyleMaps = kml.getElementsByTagName('StyleMap');
  [].forEach.call(StyleMaps, style => {
    style.parentNode.removeChild(style);
  });
  return kml;
}
