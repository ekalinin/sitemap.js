/**
 * Created by user on 2019/5/29.
 */

import fs = require('fs')
import zlib = require('zlib')
import path = require('path')

export const CACHE_FILE = path.join(__dirname, `~tempFile.tmp`);

export function createCache()
{
	let stat = truncateSync(CACHE_FILE)

	return {
		cacheFile: CACHE_FILE,
		stat,
	}
}

export function unlinkCache()
{
	return fs.unlinkSync(CACHE_FILE)
}

export function truncateSync(file: string)
{
	const tempFile = fs.openSync(file, 'w')
	fs.closeSync(tempFile);

	const stat = fs.statSync(file);

	return stat
}
