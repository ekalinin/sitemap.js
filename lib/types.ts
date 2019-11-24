import { URL } from 'url';
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

export const allowDeny = /^(?:allow|deny)$/;
export const validators: { [index: string]: RegExp } = {
  'price:currency': /^[A-Z]{3}$/,
  'price:type': /^(?:rent|purchase|RENT|PURCHASE)$/,
  'price:resolution': /^(?:HD|hd|sd|SD)$/,
  'platform:relationship': allowDeny,
  'restriction:relationship': allowDeny,
  restriction: /^([A-Z]{2}( +[A-Z]{2})*)?$/,
  platform: /^((web|mobile|tv)( (web|mobile|tv))*)?$/,
  language: /^zh-cn|zh-tw|([a-z]{2,3})$/,
  genres: /^(PressRelease|Satire|Blog|OpEd|Opinion|UserGenerated)(, *(PressRelease|Satire|Blog|OpEd|Opinion|UserGenerated))*$/,
  // eslint-disable-next-line @typescript-eslint/camelcase
  stock_tickers: /^(\w+:\w+(, *\w+:\w+){0,4})?$/,
};

export function isPriceType(pt: string | PriceType): pt is PriceType {
  return validators['price:type'].test(pt);
}

export function isResolution(res: string): res is Resolution {
  return validators['price:resolution'].test(res);
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
  no = 'no',
}

export function isValidYesNo(yn: string): yn is EnumYesNo {
  return /^YES|NO|[Yy]es|[Nn]o$/.test(yn);
}

export enum EnumAllowDeny {
  ALLOW = 'allow',
  DENY = 'deny',
}

export function isAllowDeny(ad: string): ad is EnumAllowDeny {
  return allowDeny.test(ad);
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
  view_count?: number;
  publication_date?: string;
  category?: string;
  restriction?: string;
  'restriction:relationship'?: string;
  gallery_loc?: string;
  'gallery_loc:title'?: string;
  price?: string;
  'price:resolution'?: Resolution;
  'price:currency'?: string;
  'price:type'?: PriceType;
  uploader?: string;
  platform?: string;
  id?: string;
  'platform:relationship'?: EnumAllowDeny;
}

export type PriceType = 'rent' | 'purchase' | 'RENT' | 'PURCHASE';
export type Resolution = 'HD' | 'hd' | 'sd' | 'SD';

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
  level?: ErrorLevel;
  lastmodDateOnly?: boolean;
}

export enum ValidTagNames {
  url = 'url',
  loc = 'loc',
  urlset = 'urlset',
  lastmod = 'lastmod',
  changefreq = 'changefreq',
  priority = 'priority',
  'video:thumbnail_loc' = 'video:thumbnail_loc',
  'video:video' = 'video:video',
  'video:title' = 'video:title',
  'video:description' = 'video:description',
  'video:tag' = 'video:tag',
  'video:duration' = 'video:duration',
  'video:player_loc' = 'video:player_loc',
  'video:content_loc' = 'video:content_loc',
  'image:image' = 'image:image',
  'image:loc' = 'image:loc',
  'image:geo_location' = 'image:geo_location',
  'image:license' = 'image:license',
  'image:title' = 'image:title',
  'image:caption' = 'image:caption',
  'video:requires_subscription' = 'video:requires_subscription',
  'video:publication_date' = 'video:publication_date',
  'video:id' = 'video:id',
  'video:restriction' = 'video:restriction',
  'video:family_friendly' = 'video:family_friendly',
  'video:view_count' = 'video:view_count',
  'video:uploader' = 'video:uploader',
  'video:expiration_date' = 'video:expiration_date',
  'video:platform' = 'video:platform',
  'video:price' = 'video:price',
  'video:rating' = 'video:rating',
  'video:category' = 'video:category',
  'video:live' = 'video:live',
  'video:gallery_loc' = 'video:gallery_loc',
  'news:news' = 'news:news',
  'news:publication' = 'news:publication',
  'news:name' = 'news:name',
  'news:access' = 'news:access',
  'news:genres' = 'news:genres',
  'news:publication_date' = 'news:publication_date',
  'news:title' = 'news:title',
  'news:keywords' = 'news:keywords',
  'news:stock_tickers' = 'news:stock_tickers',
  'news:language' = 'news:language',
  'mobile:mobile' = 'mobile:mobile',
  'xhtml:link' = 'xhtml:link',
  'expires' = 'expires',
}
