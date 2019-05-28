import builder = require('xmlbuilder');
import { EnumAllowDeny, EnumChangefreq, EnumYesNo } from './types';
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
    'player_loc:autoplay': any;
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
    gallery_loc?: any;
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
    buildVideoElement(video: IVideoItem): void;
    buildXML(): builder.XMLElementOrXMLNode;
    /**
     *  Alias for toXML()
     *  @return {String}
     */
    toString(): string;
}
export default SitemapItem;
