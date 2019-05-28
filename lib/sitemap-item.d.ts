import builder = require('xmlbuilder');

export declare interface NewsItem {
  publication: {
    name: string,
    language: string
  },
  genres: string,
  publication_date: string,
  title: string,
  keywords: string,
  stock_tickers: string
}

export declare interface SitemapImg {
  url: string,
  caption: string,
  title: string,
  geoLocation: string,
  license: string
}

export declare enum yesno {
  yes = 'yes',
  no = 'no'
}
export declare enum allowdeny {
  allow = 'allow',
  deny = 'deny'
}
export declare type ChangeFrequency = 'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'
export declare interface VideoItem {
  thumbnail_loc: string;
  title: string;
  description: string;
  content_loc?: string;
  player_loc?: string;
  'player_loc:autoplay'
  duration?: string|number;
  expiration_date?: string;
  rating?: string|number;
  view_count?: string|number;
  publication_date?: string;
  family_friendly?: yesno;
  tag?: string | string[];
  category?: string;
  restriction?: string;
  'restriction:relationship': string,
  gallery_loc?: any;
  price?: string;
  'price:resolution'?: string;
  'price:currency'?: string;
  'price:type'?: string;
  requires_subscription?: yesno;
  uploader?: string;
  platform?: string;
  'platform:relationship'?: allowdeny;
  live?: yesno;
}

export declare interface LinkItem {
  lang: string;
  url: string;
}

export declare interface SitemapItemOptions {
  safe?: boolean;
  lastmodfile?: any;
  lastmodrealtime?: boolean;
  lastmod?: string;
  lastmodISO?: string;
  changefreq?: ChangeFrequency;
  priority?: number;
  news?: NewsItem;
  img?: SitemapImg;
  links?: LinkItem[];
  expires?: string;
  androidLink?: string;
  mobile?: boolean|string;
  video?: VideoItem;
  ampLink?: string;
  root?: builder.XMLElementOrXMLNode;
  url?: string;
}

/**
 * Item in sitemap
 */
export declare class SitemapItem {
    conf: SitemapItemOptions;
    loc: SitemapItemOptions["url"];
    lastmod: SitemapItemOptions["lastmod"];
    changefreq: SitemapItemOptions["changefreq"];
    priority: SitemapItemOptions["priority"];
    news?: SitemapItemOptions["news"];
    img?: SitemapItemOptions["img"];
    links?: SitemapItemOptions["links"];
    expires?: SitemapItemOptions["expires"];
    androidLink?: SitemapItemOptions["androidLink"];
    mobile?: SitemapItemOptions["mobile"];
    video?: SitemapItemOptions["video"];
    ampLink?: SitemapItemOptions["ampLink"];
    root: builder.XMLElementOrXMLNode;
    url: builder.XMLElementOrXMLNode & {
        children?: [];
        attributes?: {};
    };
    constructor(conf?: SitemapItemOptions);
    /**
     *  Create sitemap xml
     *  @return {String}
     */
    toXML(): string;
    buildVideoElement(video: VideoItem): void;
    buildXML(): builder.XMLElementOrXMLNode;
    /**
     *  Alias for toXML()
     *  @return {String}
     */
    toString(): string;
}
