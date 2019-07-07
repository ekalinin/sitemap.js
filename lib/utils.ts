/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
import padStart from 'lodash.padStart';

export function getTimestampFromDate (dt: Date, bRealtime?: boolean): string {
  let timestamp = [dt.getUTCFullYear(), padStart((dt.getUTCMonth() + 1) as any, 2, '0'),
    padStart(dt.getUTCDate() as any, 2, '0')].join('-');

  // Indicate that lastmod should include minutes and seconds (and timezone)
  if (bRealtime && bRealtime === true) {
    timestamp += 'T';
    timestamp += [padStart(dt.getUTCHours() as any, 2, '0'),
      padStart(dt.getUTCMinutes() as any, 2, '0'),
      padStart(dt.getUTCSeconds() as any, 2, '0')
    ].join(':');
    timestamp += 'Z';
  }

  return timestamp;
}
