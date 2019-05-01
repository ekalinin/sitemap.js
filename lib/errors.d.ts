/**
 * URL in SitemapItem does not exists
 */
export declare class NoURLError extends Error {
    constructor(message?: any);
}
/**
 * Protocol in URL does not exists
 */
export declare class NoURLProtocolError extends Error {
    constructor(message?: any);
}
/**
 * changefreq property in sitemap is invalid
 */
export declare class ChangeFreqInvalidError extends Error {
    constructor(message?: any);
}
/**
 * priority property in sitemap is invalid
 */
export declare class PriorityInvalidError extends Error {
    constructor(message?: any);
}
/**
 * SitemapIndex target Folder does not exists
 */
export declare class UndefinedTargetFolder extends Error {
    constructor(message?: any);
}
export declare class InvalidVideoFormat extends Error {
    constructor(message?: any);
}
export declare class InvalidVideoDuration extends Error {
    constructor(message?: any);
}
export declare class InvalidVideoDescription extends Error {
    constructor(message?: any);
}
export declare class InvalidAttrValue extends Error {
    constructor(key: any, val: any, validator: any);
}
export declare class InvalidAttr extends Error {
    constructor(key: any);
}
export declare class InvalidNewsFormat extends Error {
    constructor(message?: any);
}
export declare class InvalidNewsAccessValue extends Error {
    constructor(message?: any);
}
