import builder = require('xmlbuilder');
export declare const enum EnumChangefreq {
    DAILY = "daily",
    MONTHLY = "monthly",
    ALWAYS = "always",
    HOURLY = "hourly",
    WEEKLY = "weekly",
    YEARLY = "yearly",
    NEVER = "never"
}
export declare const CHANGEFREQ: readonly [EnumChangefreq.ALWAYS, EnumChangefreq.HOURLY, EnumChangefreq.DAILY, EnumChangefreq.WEEKLY, EnumChangefreq.MONTHLY, EnumChangefreq.YEARLY, EnumChangefreq.NEVER];
export declare const enum EnumYesNo {
    YES = "yes",
    NO = "no"
}
export declare const enum EnumAllowDeny {
    ALLOW = "allow",
    DENY = "deny"
}
export declare type ICallback<E extends Error, T> = (err: E, data?: T) => void;
export interface INewsItem {
    publication: {
        name: string;
        language: string;
    };
    genres: string;
    publication_date: string;
    title: string;
    keywords: string;
    stock_tickers: string;
}
export interface ISitemapImg {
    url: string;
    caption: string;
    title: string;
    geoLocation: string;
    license: string;
    length?: never;
}
export interface IVideoItem {
    thumbnail_loc: string;
    title: string;
    description: string;
    content_loc?: string;
    player_loc?: string;
    'player_loc:autoplay': boolean;
    duration?: string | number;
    expiration_date?: string;
    rating?: string | number;
    view_count?: string | number;
    publication_date?: string;
    family_friendly?: EnumYesNo;
    tag?: string | string[];
    category?: string;
    restriction?: string;
    'restriction:relationship': string;
    gallery_loc?: string;
    price?: string;
    'price:resolution'?: string;
    'price:currency'?: string;
    'price:type'?: string;
    requires_subscription?: EnumYesNo;
    uploader?: string;
    platform?: string;
    'platform:relationship'?: EnumAllowDeny;
    live?: EnumYesNo;
}
export interface ILinkItem {
    lang: string;
    url: string;
}
export interface SitemapItemOptions {
    safe?: boolean;
    lastmodfile?: any;
    lastmodrealtime?: boolean;
    lastmod?: string;
    lastmodISO?: string;
    changefreq?: EnumChangefreq;
    priority?: number;
    news?: INewsItem;
    img?: Partial<ISitemapImg> | Partial<ISitemapImg>[];
    links?: ILinkItem[];
    expires?: string;
    androidLink?: string;
    mobile?: boolean | string;
    video?: IVideoItem;
    ampLink?: string;
    root?: builder.XMLElementOrXMLNode;
    url?: string;
    cdata?: any;
}
