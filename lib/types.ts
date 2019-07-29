import { XMLElement, XMLCData } from 'xmlbuilder';
import { URL } from 'url'
// can't be const enum if we use babel to compile
// https://github.com/babel/babel/issues/8741
export enum EnumChangefreq {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  ALWAYS = 'always',
  HOURLY = 'hourly',
  WEEKLY = 'weekly',
  YEARLY = 'yearly',
  NEVER = 'never',
}

export const CHANGEFREQ = [
  EnumChangefreq.ALWAYS,
  EnumChangefreq.HOURLY,
  EnumChangefreq.DAILY,
  EnumChangefreq.WEEKLY,
  EnumChangefreq.MONTHLY,
  EnumChangefreq.YEARLY,
  EnumChangefreq.NEVER
];

export enum EnumYesNo {
  YES = 'YES',
  NO = 'NO',
  Yes = 'Yes',
  No = 'No',
  yes = 'yes',
  no = 'no'
}

export enum EnumAllowDeny {
  ALLOW = 'allow',
  DENY = 'deny'
}

export type ICallback<E extends Error, T> = (err?: E, data?: T) => void;

export interface INewsItem {
  access?: 'Registration' | 'Subscription';
  publication: {
    name: string;
    language: string;
  };
  genres?: string;
  publication_date: string;
  title: string;
  keywords?: string;
  stock_tickers?: string;
}

export interface ISitemapImg {
  url: string;
  caption?: string;
  title?: string;
  geoLocation?: string;
  license?: string;
}

interface IVideoItemBase {
  thumbnail_loc: string;
  title: string;
  description: string;
  content_loc?: string;
  player_loc?: string;
  'player_loc:autoplay'?: string;
  duration?: number;
  expiration_date?: string;
  view_count?: string | number;
  publication_date?: string;
  category?: string;
  restriction?: string;
  'restriction:relationship'?: string;
  gallery_loc?: string;
  'gallery_loc:title'?: string;
  price?: string;
  'price:resolution'?: string;
  'price:currency'?: string;
  'price:type'?: string;
  uploader?: string;
  platform?: string;
  id?: string;
  'platform:relationship'?: EnumAllowDeny;
}

export interface IVideoItem extends IVideoItemBase {
  tag: string[];
  rating?: number;
  family_friendly?: EnumYesNo;
  requires_subscription?: EnumYesNo;
  live?: EnumYesNo;
}

export interface IVideoItemLoose extends IVideoItemBase {
  tag?: string | string[];
  rating?: string | number;
  family_friendly?: EnumYesNo | boolean;
  requires_subscription?: EnumYesNo | boolean;
  live?: EnumYesNo | boolean;
}

export interface ILinkItem {
  lang: string;
  url: string;
}

export interface SitemapIndexItemOptions {
  url: string;
  lastmod?: string;
  lastmodISO?: string;
}

interface SitemapItemOptionsBase {
  safe?: boolean;
  lastmod?: string;
  changefreq?: EnumChangefreq;
  fullPrecisionPriority?: boolean;
  priority?: number;
  news?: INewsItem;
  expires?: string;
  androidLink?: string;
  mobile?: boolean | string;
  ampLink?: string;
  root?: XMLElement;
  url: string;
  cdata?: boolean;
}

export interface SitemapItemOptions extends SitemapItemOptionsBase {
  img: ISitemapImg[];
  video: IVideoItem[];
  links: ILinkItem[];
}

export interface SitemapItemOptionsLoose extends SitemapItemOptionsBase {
  video?: IVideoItemLoose | IVideoItemLoose[];
  img?: string | ISitemapImg | (string | ISitemapImg)[];
  links?: ILinkItem[];
  lastmodfile?: string | Buffer | URL;
  lastmodISO?: string;
  lastmodrealtime?: boolean;
}
