import { SitemapItemStream, streamToPromise } from '../index';
import {
  simpleText,
  simpleURL,
  date,
  el,
  simpleURLEscaped,
  simpleTextEscaped,
  escapable,
  attrEscaped,
} from './mocks/generator';

describe('sitemapItem-stream', () => {
  it('full options', async () => {
    const testData = {
      img: [
        {
          url: simpleURL,
          caption: simpleText,
          geoLocation: simpleText,
          title: simpleText,
          license: simpleURL,
        },
        {
          url: simpleURL,
          caption: simpleText,
          geoLocation: simpleText,
          title: simpleText,
          license: simpleURL,
        },
      ],
      video: [
        {
          tag: [simpleText, simpleText],
          thumbnail_loc: simpleURL,
          title: simpleText,
          description: simpleText,
          'player_loc:autoplay': 'ap=1' + escapable,
          player_loc: simpleURL,
          duration: 1208,
          publication_date: date,
          requires_subscription: 'YES',
          id: simpleURL,
        },
        {
          tag: [simpleText],
          thumbnail_loc: simpleURL,
          title: simpleText,
          description: simpleText,
          content_loc: simpleURL,
          duration: 3070,
          expiration_date: date,
          rating: 2.5,
          view_count: '1000',
          publication_date: date,
          category: simpleText,
          family_friendly: 'no',
          'restriction:relationship': 'deny',
          restriction: 'IE GB US CA',
          'gallery_loc:title': simpleText,
          gallery_loc: simpleURL,
          'price:resolution': 'HD',
          'price:currency': 'USD',
          'price:type': 'rent',
          price: '1.99',
          requires_subscription: 'no',
          uploader: simpleText,
          'uploader:info': simpleURL,
          'platform:relationship': 'allow',
          platform: 'tv',
          live: 'no',
        },
      ],
      links: [
        {
          lang: 'en',
          url: simpleURL,
        },
        {
          lang: 'ja',
          url: simpleURL,
        },
      ],
      url: simpleURL,
      lastmod: '2019-01-01',
      fullPrecisionPriority: true,
      priority: 0.9942,
      changefreq: 'weekly',
      expires: '2019-01-01',
      androidLink: 'android-app://com.company.test/page-1/',
      news: {
        publication: {
          name: simpleText,
          language: 'en',
        },
        publication_date: date,
        title: simpleText,
        access: 'Registration',
        genres: simpleText,
        keywords: simpleText,
        stock_tickers: 'NASDAQ:A, NASDAQ:B',
      },
      ampLink: 'http://ampproject.org/article.amp.html',
    };
    const smis = new SitemapItemStream();
    smis.write(testData);
    smis.end();
    expect((await streamToPromise(smis)).toString()).toBe(
      el(
        'url',
        el('loc', simpleURLEscaped) +
          el('lastmod', '2019-01-01') +
          el('changefreq', 'weekly') +
          el('priority', '0.9942') +
          el(
            'video:video',
            el('video:thumbnail_loc', simpleURLEscaped) +
              el('video:title', simpleTextEscaped) +
              el('video:description', simpleTextEscaped) +
              '<video:player_loc autoplay="ap=1&amp;&gt;&lt;&apos;&quot;">' +
              simpleURLEscaped +
              '</video:player_loc>' +
              el('video:duration', 1208 + '') +
              el('video:publication_date', date) +
              el('video:tag', simpleTextEscaped) +
              el('video:tag', simpleTextEscaped) +
              el('video:requires_subscription', 'YES') +
              '<video:id type="url">' +
              simpleURLEscaped +
              '</video:id>'
          ) +
          el(
            'video:video',
            el('video:thumbnail_loc', simpleURLEscaped) +
              el('video:title', simpleTextEscaped) +
              el('video:description', simpleTextEscaped) +
              el('video:content_loc', simpleURLEscaped) +
              el('video:duration', 3070 + '') +
              el('video:expiration_date', date) +
              el('video:rating', 2.5 + '') +
              el('video:view_count', 1000 + '') +
              el('video:publication_date', date) +
              el('video:tag', simpleTextEscaped) +
              el('video:category', simpleTextEscaped) +
              el('video:family_friendly', 'no') +
              '<video:restriction relationship="deny">IE GB US CA</video:restriction>' +
              `<video:gallery_loc title="${
                simpleText.slice(0, simpleText.length - escapable.length * 2) +
                attrEscaped +
                attrEscaped
              }">${simpleURLEscaped}</video:gallery_loc>` +
              '<video:price resolution="HD" currency="USD" type="rent">1.99</video:price>' +
              el('video:requires_subscription', 'no') +
              '<video:uploader info="' +
              simpleURLEscaped +
              '">' +
              simpleTextEscaped +
              '</video:uploader>' +
              '<video:platform relationship="allow">tv</video:platform>' +
              el('video:live', 'no')
          ) +
          `<xhtml:link rel="alternate" hreflang="en" href="${simpleURLEscaped}"/>` +
          `<xhtml:link rel="alternate" hreflang="ja" href="${simpleURLEscaped}"/>` +
          el('expires', '2019-01-01T00:00:00.000Z') +
          '<xhtml:link rel="alternate" href="android-app://com.company.test/page-1/"/>' +
          '<xhtml:link rel="amphtml" href="http://ampproject.org/article.amp.html"/>' +
          el(
            'news:news',
            el(
              'news:publication',
              el('news:name', simpleTextEscaped) + el('news:language', 'en')
            ) +
              el('news:access', 'Registration') +
              el('news:genres', simpleTextEscaped) +
              el('news:publication_date', date) +
              el('news:title', simpleTextEscaped) +
              el('news:keywords', simpleTextEscaped) +
              el('news:stock_tickers', 'NASDAQ:A, NASDAQ:B')
          ) +
          el(
            'image:image',
            el('image:loc', simpleURLEscaped) +
              el('image:caption', simpleTextEscaped) +
              el('image:geo_location', simpleTextEscaped) +
              el('image:title', simpleTextEscaped) +
              el('image:license', simpleURLEscaped)
          ) +
          el(
            'image:image',
            el('image:loc', simpleURLEscaped) +
              el('image:caption', simpleTextEscaped) +
              el('image:geo_location', simpleTextEscaped) +
              el('image:title', simpleTextEscaped) +
              el('image:license', simpleURLEscaped)
          )
      )
    );
  });
});
