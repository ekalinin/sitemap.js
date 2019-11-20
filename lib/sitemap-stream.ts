/// <reference types="node" />
import { ISitemapItemOptionsLoose, ErrorLevel } from './types';
import { Transform, TransformOptions, TransformCallback, Readable } from 'stream';
import { ISitemapOptions } from './sitemap';
export declare const preamble = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"https://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"https://www.google.com/schemas/sitemap-news/0.9\" xmlns:xhtml=\"https://www.w3.org/1999/xhtml\" xmlns:image=\"https://www.google.com/schemas/sitemap-image/1.1\" xmlns:video=\"https://www.google.com/schemas/sitemap-video/1.1\">";
export declare const closetag = "</urlset>";
export interface ISitemapStreamOpts extends TransformOptions, Pick<ISitemapOptions, 'hostname' | 'level' | 'lastmodDateOnly'> {
}
export declare class SitemapStream extends Transform {
    hostname?: string;
    level: ErrorLevel;
    hasHeadOutput: boolean;
    lastmodDateOnly: boolean;
    constructor(opts?: ISitemapStreamOpts);
    _transform(item: ISitemapItemOptionsLoose, encoding: string, callback: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
/**
 * Takes a stream returns a promise that resolves when stream emits finish
 * @param stream what you want wrapped in a promise
 */
export declare function streamToPromise(stream: Readable): Promise<Buffer>;
