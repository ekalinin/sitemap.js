/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
function padDateComponent(component: number): string {
  return String(component).padStart(2, '0');
}

export function getTimestampFromDate (dt: Date, bRealtime?: boolean): string {
  let timestamp = [dt.getUTCFullYear(), padDateComponent(dt.getUTCMonth() + 1),
    padDateComponent(dt.getUTCDate())].join('-');

  // Indicate that lastmod should include minutes and seconds (and timezone)
  if (bRealtime && bRealtime === true) {
    timestamp += 'T';
    timestamp += [padDateComponent(dt.getUTCHours()),
      padDateComponent(dt.getUTCMinutes()),
      padDateComponent(dt.getUTCSeconds())
    ].join(':');
    timestamp += 'Z';
  }

  return timestamp;
}

/**
 * Based on lodash's implementation of chunk.
 *
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 *
 * Based on Underscore.js, copyright Jeremy Ashkenas,
 * DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>
 *
 * This software consists of voluntary contributions made by many
 * individuals. For exact contribution history, see the revision history
 * available at https://github.com/lodash/lodash
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function chunk (array: any[], size = 1): any[] {
  size = Math.max(Math.trunc(size), 0);

  const length = array ? array.length : 0;
  if (!length || size < 1) {
    return [];
  }
  const result = Array(Math.ceil(length / size));
  let index = 0,
    resIndex = 0;

  while (index < length) {
    result[resIndex++] = array.slice(index, (index += size));
  }
  return result;
}
