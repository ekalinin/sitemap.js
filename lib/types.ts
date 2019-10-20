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

export const CHANGEFREQ = Object.values(EnumChangefreq);
export function isValidChangeFreq(freq: string): freq is EnumChangefreq {
  return CHANGEFREQ.includes(freq as EnumChangefreq);
}

export enum EnumYesNo {
  YES = 'YES',
  NO = 'NO',
  Yes = 'Yes',
  No = 'No',
  yes = 'yes',
  no = 'no'
}

export function isValidYesNo(yn: string): yn is EnumYesNo {
  return /^YES|NO|[Yy]es|[Nn]o$/.test(yn)
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

export interface ISitemapIndexItemOptions {
  url: string;
  lastmod?: string;
  lastmodISO?: string;
}

interface ISitemapItemOptionsBase {
  lastmod?: string;
  changefreq?: EnumChangefreq;
  fullPrecisionPriority?: boolean;
  priority?: number;
  news?: INewsItem;
  expires?: string;
  androidLink?: string;
  ampLink?: string;
  url: string;
  cdata?: boolean;
}

/**
 * Strict options for individual sitemap entries
 */
// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface SitemapItemOptions extends ISitemapItemOptionsBase {
  img: ISitemapImg[];
  video: IVideoItem[];
  links: ILinkItem[];
}

/**
 * Options for individual sitemap entries prior to normalization
 */
export interface ISitemapItemOptionsLoose extends ISitemapItemOptionsBase {
  video?: IVideoItemLoose | IVideoItemLoose[];
  img?: string | ISitemapImg | (string | ISitemapImg)[];
  links?: ILinkItem[];
  lastmodfile?: string | Buffer | URL;
  lastmodISO?: string;
  lastmodrealtime?: boolean;
}

/**
 * How to handle errors in passed in urls
 */
export enum ErrorLevel {
  SILENT = 'silent',
  WARN = 'warn',
  THROW = 'throw',
}

export interface ISitemapOptions {
  urls?: (ISitemapItemOptionsLoose | string)[];
  hostname?: string;
  cacheTime?: number;
  xslUrl?: string;
  xmlNs?: string;
  level?: ErrorLevel;
}
