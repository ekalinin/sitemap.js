import builder = require('xmlbuilder');
import { IVideoItem, SitemapItemOptions } from './types';
/**
 * Item in sitemap
 */
declare class SitemapItem {
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
export = SitemapItem;
