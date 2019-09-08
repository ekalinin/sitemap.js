import {
  EnumYesNo,
  EnumAllowDeny,
  SitemapItemOptions,
  ErrorLevel,
} from '../index'
import {
  validateSMIOptions
} from '../lib/utils'

describe("utils", () => {
  let itemTemplate: SitemapItemOptions;
  beforeEach(() => {
    itemTemplate = { url: "", video: [], img: [], links: [] };
  });

  describe("validateSMIOptions", () => {
    it('ignores errors if told to do so', () => {
      /*  eslint-disable no-new */
      expect(() => validateSMIOptions({} as SitemapItemOptions, ErrorLevel.SILENT))
        .not.toThrow()
    })

    it('throws when no config is passed', () => {
      /* eslint-disable no-new */
      expect(
        function () { validateSMIOptions(undefined, ErrorLevel.THROW) }
      ).toThrowError(/SitemapItem requires a configuration/)
    })

    it('throws an error for url absence', () => {
      /*  eslint-disable no-new */
      expect(() => validateSMIOptions({} as SitemapItemOptions, ErrorLevel.THROW))
        .toThrowError(/URL is required/)
    })

    it('sitemap: invalid changefreq error', () => {
      expect(function() {
        validateSMIOptions(
          {
            url: "/",
            // @ts-ignore
            changefreq: "allllways"
          },
          ErrorLevel.THROW
        ).toString();
      }).toThrowError(/changefreq is invalid/);
    })

    it('sitemap: invalid priority error', () => {
      expect(
        function () {
          validateSMIOptions({
            ...itemTemplate,
            url: '/',
            priority: 1.1
          },
          ErrorLevel.THROW).toString()
        }
      ).toThrowError(/priority is invalid/)
    })

    describe('news', () => {
      let news: SitemapItemOptions
      beforeEach(() => {
        news = {
          ...itemTemplate,
          url: 'http://www.example.org/business/article55.html',
          news: {
            publication: {
              name: 'The Example Times',
              language: 'en'
            },
            genres: 'PressRelease, Blog',
            publication_date: '2008-12-23',
            title: 'Companies A, B in Merger Talks',
            keywords: 'business, merger, acquisition, A, B',
            stock_tickers: 'NASDAQ:A, NASDAQ:B'
          }
        }
      })

      it('will throw if you dont provide required attr publication', () => {
        delete news.news.publication

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW)
        }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
      })

      it('will throw if you dont provide required attr publication name', () => {
        delete news.news.publication.name

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW)
        }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
      })

      it('will throw if you dont provide required attr publication language', () => {
        delete news.news.publication.language

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW)
        }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
      })

      it('will throw if you dont provide required attr title', () => {
        delete news.news.title

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW)
        }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
      })

      it('will throw if you dont provide required attr publication_date', () => {
        delete news.news.publication_date

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW)
        }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
      })

      it('will throw if you provide an invalid value for access', () => {
        // @ts-ignore
        news.news.access = 'a'

        expect(() => {
          validateSMIOptions(news, ErrorLevel.THROW)
        }).toThrowError(/News access must be either Registration, Subscription or not be present/)
      })
    })

    describe('video', () => {
      let testvideo: SitemapItemOptions
      beforeEach(() => {
        testvideo = {
          ...itemTemplate,
          url: 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          video: [{
            id: "http://example.com/url",
            title: "2008:E2 - Burnout Paradise: Millionaire's Club",
            description: "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
            player_loc: 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            'player_loc:autoplay': 'ap=1',
            restriction: 'IE GB US CA',
            'restriction:relationship': 'allow',
            gallery_loc: 'https://roosterteeth.com/series/awhu',
            'gallery_loc:title': 'awhu series page',
            price: '1.99',
            'price:currency': 'EUR',
            'price:type': 'rent',
            'price:resolution': 'HD',
            platform: 'WEB',
            'platform:relationship': EnumAllowDeny.ALLOW,
            thumbnail_loc: 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
            duration: 174,
            publication_date: '2008-07-29T14:58:04.000Z',
            requires_subscription: EnumYesNo.yes,
            tag: []
          }]
        }
      })

      it('throws if a required attr is not provided', () => {
        expect(() => {
          const test = Object.assign({}, testvideo)
          delete test.video[0].title
          validateSMIOptions(test, ErrorLevel.THROW)

        }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

        expect(() => {
          const test = Object.assign({}, testvideo)
          // @ts-ignore
          test.video[0] = 'a'
          validateSMIOptions(test, ErrorLevel.THROW)
        }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

        expect(() => {
          const test = Object.assign({}, testvideo)
          delete test.video[0].thumbnail_loc
          validateSMIOptions(test, ErrorLevel.THROW)

        }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

        expect(() => {
          const test = Object.assign({}, testvideo)
          delete test.video[0].description
          validateSMIOptions(test, ErrorLevel.THROW)
        }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)
      })
    })

    it("video duration", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description:
                  "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                duration: -1,
                publication_date: "2008-07-29T14:58:04.000Z",
                requires_subscription: EnumYesNo.yes,
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(/duration must be an integer/);
    });

    it("video description limit", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                // @ts-ignore
                description:
                  "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. Fusce vulputate eleifend sapien. Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu. Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut eros et nisl sagittis vestibulum. Nullam nulla.",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                duration: 1,
                publication_date: "2008-07-29T14:58:04.000Z",
                requires_subscription: EnumYesNo.NO,
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(
        /no longer than 2048/
      );
    });

    it("video price type", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: "Lorem ipsum",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                price: "1.99",
                "price:type": "subscription",
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(/is not a valid value for attr: "price:type"/);
    });

    it("video price currency", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: "Lorem ipsum",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                price: "1.99",
                // @ts-ignore
                "price:currency": "dollar",
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(/is not a valid value for attr: "price:currency"/);
    });

    it("video price resolution", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: "Lorem ipsum",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                price: "1.99",
                // @ts-ignore
                "price:resolution": "1920x1080",
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(/is not a valid value for attr: "price:resolution"/);
    });

    it("video platform relationship", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            // @ts-ignore
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: "Lorem ipsum",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                platform: "tv",
                // @ts-ignore
                "platform:relationship": "mother",
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(/is not a valid value for attr: "platform:relationship"/);
    });

    it("video restriction", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: "Lorem ipsum",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                restriction: "IE GB US CA",
                "restriction:relationship": "father",
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(
        /is not a valid value for attr: "restriction:relationship"/
      );
    });

    it("video restriction", () => {
      expect(function() {
        validateSMIOptions(
          {
            ...itemTemplate,
            url:
              "https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
            video: [
              {
                title: "2008:E2 - Burnout Paradise: Millionaire's Club",
                description: "Lorem ipsum",
                player_loc:
                  "https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club",
                thumbnail_loc:
                  "https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg",
                restriction: "IE GB US CA",
                rating: 6,
                tag: []
              }
            ]
          },
          ErrorLevel.THROW
        );
      }).toThrowError(
        /0 and 5/
      );
    });
  });
});
