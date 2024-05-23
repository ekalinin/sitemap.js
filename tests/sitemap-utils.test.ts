import {
  EnumYesNo,
  EnumAllowDeny,
  SitemapItem,
  ErrorLevel,
  SitemapItemLoose,
  EnumChangefreq,
  SitemapStream,
} from '../index';
import * as testUtil from './util';
import {
  validateSMIOptions,
  lineSeparatedURLsToSitemapOptions,
  normalizeURL,
  mergeStreams,
} from '../lib/utils';
import MemoryStream from 'memorystream';
import { promisify } from 'util';
import { Readable, Writable, finished } from 'stream';
import { streamToPromise } from '../lib/sitemap-stream';
const finishedP = promisify(finished);

describe('utils', () => {
  let itemTemplate: SitemapItem;
  beforeEach(() => {
    itemTemplate = { url: '', video: [], img: [], links: [] };
  });

  describe('validateSMIOptions', () => {
    it('ignores errors if told to do so', () => {
      expect(() =>
        validateSMIOptions({} as SitemapItem, ErrorLevel.SILENT)
      ).not.toThrow();
    });

    it('throws when no config is passed', () => {
      expect(function () {
        // @ts-expect-error testing bad option
        validateSMIOptions(undefined, ErrorLevel.THROW);
      }).toThrow(/SitemapItem requires a configuration/);
    });

    it('throws an error for url absence', () => {
      expect(() =>
        validateSMIOptions({} as SitemapItem, ErrorLevel.THROW)
      ).toThrow(/URL is required/);
    });

    it('sitemap: invalid changefreq error', () => {
      expect(function () {
        validateSMIOptions(
          {
            url: '/',
            // @ts-expect-error testing bad option
            changefreq: 'allllways',
          },
          ErrorLevel.THROW
        ).toString();
      }).toThrow(/changefreq "allllways" is invalid/);
    });

    it('sitemap: invalid priority error', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url: '/',
            priority: 1.1,
          },
          ErrorLevel.THROW
        ).toString();
      }).toThrow(/priority "1.1" must be a number between/);
    });

    describe('news', () => {
      let news: SitemapItem;
      beforeEach(() => {
        news = {
          ...itemTemplate,
          url: 'http://www.example.org/business/article55.html',
          news: {
            publication: {
              name: 'The Example Times',
              language: 'en',
            },
            genres: 'PressRelease, Blog',
            publication_date: '2008-12-23',
            title: 'Companies A, B in Merger Talks',
            keywords: 'business, merger, acquisition, A, B',
            stock_tickers: 'NASDAQ:A, NASDAQ:B',
          },
        };
      });

      it('will throw if you dont provide required attr publication', () => {
        expect(news.news).toBeDefined();
        if (!news.news) {
          throw new Error('news.news is undefined');
        }
        delete (news.news as Partial<typeof news.news>).publication;

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW);
        }).toThrow(
          /must include publication, publication name, publication language, title, and publication_date for news/
        );
      });

      it('will throw if you dont provide required attr publication name', () => {
        expect(news.news).toBeDefined();
        if (!news.news) {
          throw new Error('news.news is undefined');
        }
        expect(news.news.publication).toBeDefined();
        if (!news.news.publication) {
          throw new Error('news.news.publication is undefined');
        }
        delete (news.news.publication as Partial<typeof news.news.publication>)
          .name;

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW);
        }).toThrow(
          /must include publication, publication name, publication language, title, and publication_date for news/
        );
      });

      it('will throw if you dont provide required attr publication language', () => {
        expect(news.news).toBeDefined();
        if (!news.news) {
          throw new Error('news.news is undefined');
        }
        expect(news.news.publication).toBeDefined();
        if (!news.news.publication) {
          throw new Error('news.news.publication is undefined');
        }
        delete (news.news.publication as Partial<typeof news.news.publication>)
          .language;

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW);
        }).toThrow(
          /must include publication, publication name, publication language, title, and publication_date for news/
        );
      });

      it('will throw if you dont provide required attr title', () => {
        expect(news.news).toBeDefined();
        if (!news.news) {
          throw new Error('news.news is undefined');
        }
        delete (news.news as Partial<typeof news.news>).title;

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW);
        }).toThrow(
          /must include publication, publication name, publication language, title, and publication_date for news/
        );
      });

      it('will throw if you dont provide required attr publication_date', () => {
        expect(news.news).toBeDefined();
        if (!news.news) {
          throw new Error('news.news is undefined');
        }
        delete (news.news as Partial<typeof news.news>).publication_date;

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW);
        }).toThrow(
          /must include publication, publication name, publication language, title, and publication_date for news/
        );
      });

      it('will throw if you provide an invalid value for access', () => {
        // @ts-expect-error testing bad option
        news.news.access = 'a';

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW);
        }).toThrow(
          /News access "a" must be either Registration, Subscription or not be present/
        );
      });

      it('will not throw if everythign is valid', () => {
        news.news!.access = 'Registration';

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW);
        }).not.toThrow();
      });
    });

    describe('video', () => {
      let testvideo: SitemapItem;
      beforeEach(() => {
        testvideo = {
          ...itemTemplate,
          url:
            'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          video: [
            {
              id: 'http://example.com/url',
              title: "2008:E2 - Burnout Paradise: Millionaire's Club",
              description:
                "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
              player_loc:
                'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
              'player_loc:autoplay': 'ap=1',
              restriction: 'IE GB US CA',
              'restriction:relationship': EnumAllowDeny.ALLOW,
              gallery_loc: 'https://roosterteeth.com/series/awhu',
              'gallery_loc:title': 'awhu series page',
              price: '1.99',
              'price:currency': 'EUR',
              'price:type': 'rent',
              'price:resolution': 'HD',
              platform: 'WEB',
              'platform:relationship': EnumAllowDeny.ALLOW,
              thumbnail_loc:
                'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
              duration: 174,
              publication_date: '2008-07-29T14:58:04.000Z',
              requires_subscription: EnumYesNo.yes,
              tag: [],
            },
          ],
        };
      });

      it('throws if a required attr is not provided', () => {
        expect(() => {
          const test = Object.assign({}, testvideo);
          delete (test.video[0] as Partial<(typeof test.video)[0]>).title;
          validateSMIOptions(test, ErrorLevel.THROW);
        }).toThrow(
          /must include thumbnail_loc, title and description fields for videos/
        );

        expect(() => {
          const test = Object.assign({}, testvideo);
          // @ts-expect-error testing bad option
          test.video[0] = 'a';
          validateSMIOptions(test, ErrorLevel.THROW);
        }).toThrow(
          /must include thumbnail_loc, title and description fields for videos/
        );

        expect(() => {
          const test = Object.assign({}, testvideo);
          delete (test.video[0] as Partial<(typeof test.video)[0]>)
            .thumbnail_loc;
          validateSMIOptions(test, ErrorLevel.THROW);
        }).toThrow(
          /must include thumbnail_loc, title and description fields for videos/
        );

        expect(() => {
          const test = Object.assign({}, testvideo);
          delete (test.video[0] as Partial<(typeof test.video)[0]>).description;
          validateSMIOptions(test, ErrorLevel.THROW);
        }).toThrow(
          /must include thumbnail_loc, title and description fields for videos/
        );
      });
    });

    it('video duration', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description:
                  "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                duration: -1,
                publication_date: '2008-07-29T14:58:04.000Z',
                requires_subscription: EnumYesNo.yes,
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/must be an integer of seconds/);
    });

    it('video description limit', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description:
                  'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. Fusce vulputate eleifend sapien. Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu. Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut eros et nisl sagittis vestibulum. Nullam nulla.',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                duration: 1,
                publication_date: '2008-07-29T14:58:04.000Z',
                requires_subscription: EnumYesNo.NO,
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/long 2100 vs limit of 2048/);
    });

    it('video title limit', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title:
                  "2008:E2 - Burnout Paradise: Millionaire's Clubconsectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. Fusce vulputate eleifend sapien. Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu. Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut eros et nisl sagittis vestibulum. Nullam nulla.',",
                description: 'Lorem ipsum dolor sit amet, ',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                duration: 1,
                publication_date: '2008-07-29T14:58:04.000Z',
                requires_subscription: EnumYesNo.NO,
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/long 2120 vs 100/);
    });

    it('video price type', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                price: '1.99',
                // @ts-expect-error testing bad option
                'price:type': 'subscription',
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/is not "rent" or "purchase"/);
    });

    it('video price currency', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                price: '1.99',
                'price:currency': 'dollar',
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/abbrieviation for the country currency/);
    });

    it('video price resolution', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                price: '1.99',
                // @ts-expect-error testing bad option
                'price:resolution': '1920x1080',
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/is not hd or sd/);
    });

    it('requires video price type when price is not provided', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                platform: 'tv',
                price: '',
                // @ts-expect-error testing bad option
                'platform:relationship': 'mother',
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/priceType is required when price is not provided/);
    });

    it('video platform relationship', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                platform: 'tv',
                // @ts-expect-error testing bad option
                'platform:relationship': 'mother',
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/is not a valid value for attr: "platform:relationship"/);
    });

    it('throws without a restriction of allow or deny', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                restriction: 'IE GB US CA',
                // @ts-expect-error testing bad option
                'restriction:relationship': 'father',
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/must be either allow or deny/);
    });

    it('throws if it gets a rating out of bounds', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                restriction: 'IE GB US CA',
                rating: 6,
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/0 and 5/);
    });

    it('throws if it gets an invalid video restriction', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                rating: 5,
                restriction: 's',

                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/country codes/);
    });

    it('throws if it gets an invalid value for family friendly', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                rating: 5,
                // @ts-expect-error testing bad option
                family_friendly: 'foo',

                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/family friendly/);
    });

    it('throws if it gets a category that is too long', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                rating: 5,
                category:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpghttps://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpghttps://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpghttps://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/video category can only be 256/);
    });

    it('throws if it gets a negative view count', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                restriction: 'IE GB US CA',
                rating: 5,
                view_count: -1,
                tag: [],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/positive/);
    });

    it('throws if it gets more than 32 tags', () => {
      expect(function () {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: 'Lorem ipsum',
                player_loc:
                  'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
                thumbnail_loc:
                  'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
                restriction: 'IE GB US CA',
                rating: 5,
                tag: [
                  'one',
                  'two',
                  'three',
                  'four',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                  '10',
                  '11',
                  '12',
                  '13',
                  '14',
                  '15',
                  '16',
                  '17',
                  '18',
                  '19',
                  '20',
                  '21',
                  '22',
                  '23',
                  '24',
                  '25',
                  '26',
                  '27',
                  '28',
                  '29',
                  '30',
                  '31',
                  '32',
                  '33',
                ],
              },
            ],
          },
          ErrorLevel.THROW
        );
      }).toThrow(/32 tags/);
    });
  });

  describe('lineSeparatedURLsToSitemap', () => {
    let rs: Readable;
    let ws: Writable;
    let drain: string[];
    const sampleURLs = ['http://example.com', 'http://example.com/path'];
    let content: string;
    beforeEach(() => {
      drain = [];
      content = sampleURLs.join('\n');
      rs = new Readable({
        read(size): void {
          if (!content) this.push(null);
          else {
            this.push(content.slice(0, size));
            content = content.slice(size);
          }
        },
      });

      ws = new Writable({
        objectMode: true,
        write(smi, enc, next): void {
          if (smi) {
            drain.push(smi);
          }
          next();
        },
      });
    });

    it('turns a line-separated stream into a sitemap', async () => {
      await new Promise<void>((resolve) => {
        lineSeparatedURLsToSitemapOptions(rs).pipe(ws);
        ws.on('finish', () => resolve());
      });
      expect(drain.length).toBe(2);
      expect(drain[0]).toBe(sampleURLs[0]);
      expect(drain[1]).toBe(sampleURLs[1]);
    });

    it('turns a line-separated JSON stream into a sitemap', async () => {
      const osampleURLs: { url: string }[] = sampleURLs.map((url) => ({ url }));
      await new Promise<void>((resolve) => {
        content = osampleURLs.map((url) => JSON.stringify(url)).join('\n');
        lineSeparatedURLsToSitemapOptions(rs, { isJSON: true }).pipe(ws);
        ws.on('finish', () => resolve());
      });
      expect(drain.length).toBe(2);
      expect(drain[0]).toEqual(osampleURLs[0]);
      expect(drain[1]).toEqual(osampleURLs[1]);
    });
  });

  describe('normalizeURL', () => {
    it('turns strings into full urls', () => {
      expect(normalizeURL('http://example.com')).toHaveProperty(
        'url',
        'http://example.com/'
      );
    });

    it('prepends paths with the provided hostname', () => {
      expect(normalizeURL('/', 'http://example.com')).toHaveProperty(
        'url',
        'http://example.com/'
      );
    });

    it('turns img prop provided as string into array of object', () => {
      const url = {
        url: 'http://example.com',
        img: 'http://example.com/img',
      };
      expect(normalizeURL(url).img[0]).toHaveProperty(
        'url',
        'http://example.com/img'
      );
    });

    it('turns img prop provided as object into array of object', () => {
      const url = {
        url: 'http://example.com',
        img: { url: 'http://example.com/img', title: 'some thing' },
      };
      expect(normalizeURL(url).img[0]).toHaveProperty(
        'url',
        'http://example.com/img'
      );
      expect(normalizeURL(url).img[0]).toHaveProperty('title', 'some thing');
    });

    it('turns img prop provided as array of strings into array of object', () => {
      const url = {
        url: 'http://example.com',
        img: ['http://example.com/img', '/img2'],
      };
      expect(normalizeURL(url, 'http://example.com/').img[0]).toHaveProperty(
        'url',
        'http://example.com/img'
      );

      expect(normalizeURL(url, 'http://example.com/').img[1]).toHaveProperty(
        'url',
        'http://example.com/img2'
      );
    });

    it('handles a valid img prop without transformation', () => {
      const url = {
        url: 'http://example.com',
        img: [
          {
            url: 'http://test.com/img2.jpg',
            caption: 'Another image',
            title: 'The Title of Image Two',
            geoLocation: 'London, United Kingdom',
            license: 'https://creativecommons.org/licenses/by/4.0/',
          },
        ],
      };
      const normal = normalizeURL(url, 'http://example.com/').img[0];
      expect(normal).toHaveProperty('url', 'http://test.com/img2.jpg');
      expect(normal).toHaveProperty('caption', 'Another image');
      expect(normal).toHaveProperty('title', 'The Title of Image Two');
      expect(normal).toHaveProperty('geoLocation', 'London, United Kingdom');
      expect(normal).toHaveProperty(
        'license',
        'https://creativecommons.org/licenses/by/4.0/'
      );
    });

    it('ensures img is always an array', () => {
      const url = {
        url: 'http://example.com',
      };
      expect(Array.isArray(normalizeURL(url).img)).toBeTruthy();
    });

    it('ensures links is always an array', () => {
      expect(
        Array.isArray(normalizeURL('http://example.com').links)
      ).toBeTruthy();
    });

    it('prepends provided hostname to links', () => {
      const url = {
        url: 'http://example.com',
        links: [{ url: '/lang', lang: 'en-us' }],
      };
      expect(normalizeURL(url, 'http://example.com').links[0]).toHaveProperty(
        'url',
        'http://example.com/lang'
      );
    });

    it('does not prepend provided hostname to links that already have a hostname', async () => {
      const sms = new SitemapStream({ hostname: 'https://example.ru/' });
      sms.write({
        url: '/docs',
        links: [
          { lang: 'ru', url: 'https://example.ru/docs' },
          { lang: 'en', url: 'https://example.com/docs' },
        ],
      });
      sms.end();

      expect((await streamToPromise(sms)).toString()).toContain(
        'https://example.com/docs'
      );

      const url = {
        url: 'http://example.ru',
        links: [
          { url: 'http://example.com/lang', lang: 'en-us' },
          { url: '/lang', lang: 'en-us' },
        ],
      };
      expect(normalizeURL(url, 'http://example.ru').links[0]).toHaveProperty(
        'url',
        'http://example.com/lang'
      );
    });

    describe('video', () => {
      it('is ensured to be an array', () => {
        expect(
          Array.isArray(normalizeURL('http://example.com').video)
        ).toBeTruthy();
        const url = {
          url: 'http://example.com',
          video: { thumbnail_loc: 'foo', title: '', description: '' },
        };
        expect(normalizeURL(url).video[0]).toHaveProperty(
          'thumbnail_loc',
          'foo'
        );
      });

      it('turns boolean-like props into yes/no', () => {
        const url = {
          url: 'http://example.com',
          video: [
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: false,
              live: false,
              requires_subscription: false,
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: true,
              live: true,
              requires_subscription: true,
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: EnumYesNo.yes,
              live: EnumYesNo.yes,
              requires_subscription: EnumYesNo.yes,
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: EnumYesNo.no,
              live: EnumYesNo.no,
              requires_subscription: EnumYesNo.no,
            },
          ],
        };
        const smv = normalizeURL(url).video;
        expect(smv[0]).toHaveProperty('family_friendly', 'no');
        expect(smv[0]).toHaveProperty('live', 'no');
        expect(smv[0]).toHaveProperty('requires_subscription', 'no');
        expect(smv[1]).toHaveProperty('family_friendly', 'yes');
        expect(smv[1]).toHaveProperty('live', 'yes');
        expect(smv[1]).toHaveProperty('requires_subscription', 'yes');
        expect(smv[2]).toHaveProperty('family_friendly', 'yes');
        expect(smv[2]).toHaveProperty('live', 'yes');
        expect(smv[2]).toHaveProperty('requires_subscription', 'yes');
        expect(smv[3]).toHaveProperty('family_friendly', 'no');
        expect(smv[3]).toHaveProperty('live', 'no');
        expect(smv[3]).toHaveProperty('requires_subscription', 'no');
      });

      it('ensures tag is always an array', () => {
        let url: SitemapItemLoose = {
          url: 'http://example.com',
          video: { thumbnail_loc: 'foo', title: '', description: '' },
        };
        expect(normalizeURL(url).video[0]).toHaveProperty('tag', []);
        url = {
          url: 'http://example.com',
          video: [
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              tag: 'fizz',
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              tag: ['bazz'],
            },
          ],
        };
        expect(normalizeURL(url).video[0]).toHaveProperty('tag', ['fizz']);
        expect(normalizeURL(url).video[1]).toHaveProperty('tag', ['bazz']);
      });

      it('ensures rating is always a number', () => {
        const url = {
          url: 'http://example.com',
          video: [
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              rating: '5',
              view_count: '10000000000',
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              rating: 4,
            },
          ],
        };
        // @ts-expect-error incomplete for brevity
        expect(normalizeURL(url).video[0]).toHaveProperty('rating', 5);
        // @ts-expect-error incomplete for brevity
        expect(normalizeURL(url).video[0]).toHaveProperty(
          'view_count',
          10000000000
        );
        // @ts-expect-error incomplete for brevity
        expect(normalizeURL(url).video[1]).toHaveProperty('rating', 4);
      });
    });

    describe('lastmod', () => {
      it('treats legacy ISO option like lastmod', () => {
        expect(
          normalizeURL({ url: 'http://example.com', lastmodISO: '2019-01-01' })
        ).toHaveProperty('lastmod', '2019-01-01T00:00:00.000Z');
      });

      it('turns all last mod strings into ISO timestamps', () => {
        expect(
          normalizeURL({ url: 'http://example.com', lastmod: '2019-01-01' })
        ).toHaveProperty('lastmod', '2019-01-01T00:00:00.000Z');

        expect(
          normalizeURL({
            url: 'http://example.com',
            lastmod: '2019-01-01T00:00:00.000Z',
          })
        ).toHaveProperty('lastmod', '2019-01-01T00:00:00.000Z');
      });

      it('date-only', () => {
        expect(
          normalizeURL(
            {
              url: 'http://example.com',
              lastmod: '2019-01-01',
            },
            undefined,
            true
          )
        ).toHaveProperty('lastmod', '2019-01-01');

        expect(
          normalizeURL(
            {
              url: 'http://example.com',
              lastmod: '2019-01-01T00:00:00.000Z',
            },
            undefined,
            true
          )
        ).toHaveProperty('lastmod', '2019-01-01');
      });

      it('supports reading off file mtime', () => {
        const { cacheFile, stat } = testUtil.createCache();

        const dt = new Date(stat.mtime);
        const lastmod = dt.toISOString();

        const smcfg = normalizeURL({
          url: 'http://example.com',
          lastmodfile: cacheFile,
          changefreq: EnumChangefreq.ALWAYS,
          priority: 0.9,
        });

        testUtil.unlinkCache();

        expect(smcfg).toHaveProperty('lastmod', lastmod);
      });
    });
  });

  describe('mergeStreams', () => {
    it('works without options passed', async () => {
      const in1 = Readable.from(['a', 'b']);
      const in2 = Readable.from(['c', 'd']);
      const memStream = new MemoryStream();
      const in1Done = finishedP(in1);
      const in2Done = finishedP(in2);
      const mergeStream = mergeStreams([in1, in2]);

      mergeStream.pipe(memStream);

      // Wait for the two inputs to be done being read
      await Promise.all([in1Done, in2Done]);

      const buff = Buffer.from(memStream.read());
      const str = buff.toString();

      expect(str).toContain('a');
      expect(str).toContain('b');
      expect(str).toContain('c');
      expect(str).toContain('d');
      expect(str).not.toContain('e');
    });

    it('works in objectMode', async () => {
      const in1 = Readable.from([{ value: 'a' }, { value: 'b' }], {
        objectMode: true,
      });
      const in2 = Readable.from([{ value: 'c' }, { value: 'd' }], {
        objectMode: true,
      });
      // @ts-expect-error MemoryStream *does* actually support and behave differently when objectMode is passed
      const memStream = new MemoryStream(undefined, { objectMode: true });
      const in1Done = finishedP(in1);
      const in2Done = finishedP(in2);
      const mergeStream = mergeStreams([in1, in2], { objectMode: true });

      mergeStream.pipe(memStream);

      // Wait for the two inputs to be done being read
      await Promise.all([in1Done, in2Done]);

      const items: { value: string }[] = [];
      let str = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const item: { value: string } = memStream.read();
        if (item === null) {
          break;
        }
        items.push(item);
        str += item.value;
      }

      expect(str.length).toBe(4);
      expect(str).toContain('a');
      expect(str).toContain('b');
      expect(str).toContain('c');
      expect(str).toContain('d');
      expect(str).not.toContain('e');
    });
  });
});
