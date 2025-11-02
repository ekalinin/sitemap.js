/* eslint-disable @typescript-eslint/no-empty-function */
// Example: Filter or delete items during sitemap parsing
// Demonstrates using a Transform stream to conditionally include/exclude URLs
import { createReadStream, createWriteStream } from 'fs';
import { Transform } from 'stream';
import { XMLToSitemapItemStream, SitemapStream } from 'sitemap';

// Example 1: Filter stream that only keeps URLs matching a pattern
const filterByPattern = new Transform({
  objectMode: true,
  transform(item, encoding, callback) {
    // Only keep URLs that contain '/blog/' in the path
    if (item.url.includes('/blog/')) {
      // Pass the item through by calling this.push()
      callback(undefined, item);
    } else {
      // Skip this item by NOT calling this.push()
      // Just call callback() to continue processing
      callback();
    }
  },
});

// Example 2: Filter stream that excludes specific patterns
const excludeByPattern = new Transform({
  objectMode: true,
  transform(item, encoding, callback) {
    // Exclude URLs containing '/admin/' or '/private/'
    if (item.url.includes('/admin/') || item.url.includes('/private/')) {
      // Skip this item - don't push it downstream
      callback();
    } else {
      // Keep all other items
      callback(undefined, item);
    }
  },
});

// Example 3: Filter based on multiple criteria
const advancedFilter = new Transform({
  objectMode: true,
  transform(item, encoding, callback) {
    // Complex filtering logic
    const shouldKeep =
      // Keep if it's a blog post
      item.url.includes('/blog/') ||
      // Or if it has high priority
      (item.priority && item.priority >= 0.8) ||
      // Or if it's marked as daily change frequency
      item.changefreq === 'daily';

    // Also exclude draft URLs
    const isDraft = item.url.includes('/draft/');

    if (shouldKeep && !isDraft) {
      callback(undefined, item);
    } else {
      callback();
    }
  },
});

// Example 4: Count filtered items
let keptCount = 0;
let droppedCount = 0;

const filterWithStats = new Transform({
  objectMode: true,
  transform(item, encoding, callback) {
    // Keep only items with priority >= 0.5
    if (item.priority && item.priority >= 0.5) {
      keptCount++;
      callback(undefined, item);
    } else {
      droppedCount++;
      callback();
    }
  },
});

// Usage: Parse an existing sitemap and filter it
console.log('Filtering sitemap.xml...');

createReadStream('./sitemap.xml')
  // Parse the XML into sitemap item objects
  .pipe(new XMLToSitemapItemStream())
  // Apply your filter (choose one or chain multiple filters)
  .pipe(filterByPattern) // or: excludeByPattern, advancedFilter, filterWithStats
  // Optional: Convert filtered items back to a new sitemap XML
  .pipe(new SitemapStream({ hostname: 'https://example.com' }))
  .pipe(createWriteStream('./filtered-sitemap.xml'))
  .on('finish', () => {
    console.log('Filtering complete!');
    console.log(`Kept: ${keptCount}, Dropped: ${droppedCount}`);
  })
  .on('error', (e) => console.error('Error:', e));

// Example 5: Just process filtered items (no XML output)
// Uncomment to use:
/*
createReadStream('./sitemap.xml')
  .pipe(new XMLToSitemapItemStream())
  .pipe(filterByPattern)
  .on('data', (item) => {
    // Do something with each filtered item
    console.log('Keeping URL:', item.url);
    // Could store in database, validate, etc.
  })
  .on('end', () => console.log('Done processing filtered items'))
  .on('error', (e) => console.error('Error:', e));
*/
