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
