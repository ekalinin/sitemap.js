import builder = require('xmlbuilder');
/**
 * Item in sitemap
 */
declare class SitemapItem {
    conf: any;
    loc: any;
    lastmod: any;
    changefreq: any;
    priority: any;
    news?: any;
    img?: any;
    links?: any;
    expires?: any;
    androidLink?: any;
    mobile?: any;
    video?: any;
    ampLink?: any;
    root: builder.XMLElementOrXMLNode;
    url: builder.XMLElementOrXMLNode & {
        children?: [];
        attributes?: {};
    };
    constructor(conf?: {
        safe?: any;
        lastmodfile?: any;
        lastmodrealtime?: boolean;
        lastmod?: any;
        lastmodISO?: any;
        changefreq?: any;
        priority?: any;
        news?: any;
        img?: any;
        links?: any;
        expires?: any;
        androidLink?: any;
        mobile?: any;
        video?: any;
        ampLink?: any;
        root?: builder.XMLElementOrXMLNode;
        url?: any;
    });
    /**
     *  Create sitemap xml
     *  @return {String}
     */
    toXML(): string;
    buildVideoElement(video: {
        thumbnail_loc: any;
        title: any;
        description: any;
        content_loc?: any;
        player_loc?: any;
        duration?: any;
        expiration_date?: any;
        rating?: any;
        view_count?: any;
        publication_date?: any;
        family_friendly?: any;
        tag?: string | string[];
        category?: any;
        restriction?: any;
        gallery_loc?: any;
        price?: any;
        requires_subscription?: any;
        uploader?: any;
        platform?: any;
        live?: any;
    }): void;
    buildXML(): builder.XMLElementOrXMLNode;
    /**
     *  Alias for toXML()
     *  @return {String}
     */
    toString(): string;
}
export = SitemapItem;
