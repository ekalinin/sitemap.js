/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * URL in SitemapItem does not exists
 */
class NoURLError extends Error {
    constructor(message) {
        super(message || 'URL is required');
        this.name = 'NoURLError';
        // @ts-ignore
        Error.captureStackTrace(this, NoURLError);
    }
}
exports.NoURLError = NoURLError;
/**
 * Protocol in URL does not exists
 */
class NoURLProtocolError extends Error {
    constructor(message) {
        super(message || 'Protocol is required');
        this.name = 'NoURLProtocolError';
        // @ts-ignore
        Error.captureStackTrace(this, NoURLProtocolError);
    }
}
exports.NoURLProtocolError = NoURLProtocolError;
/**
 * changefreq property in sitemap is invalid
 */
class ChangeFreqInvalidError extends Error {
    constructor(message) {
        super(message || 'changefreq is invalid');
        this.name = 'ChangeFreqInvalidError';
        // @ts-ignore
        Error.captureStackTrace(this, ChangeFreqInvalidError);
    }
}
exports.ChangeFreqInvalidError = ChangeFreqInvalidError;
/**
 * priority property in sitemap is invalid
 */
class PriorityInvalidError extends Error {
    constructor(message) {
        super(message || 'priority is invalid');
        this.name = 'PriorityInvalidError';
        // @ts-ignore
        Error.captureStackTrace(this, PriorityInvalidError);
    }
}
exports.PriorityInvalidError = PriorityInvalidError;
/**
 * SitemapIndex target Folder does not exists
 */
class UndefinedTargetFolder extends Error {
    constructor(message) {
        super(message || 'Target folder must exist');
        this.name = 'UndefinedTargetFolder';
        // @ts-ignore
        Error.captureStackTrace(this, UndefinedTargetFolder);
    }
}
exports.UndefinedTargetFolder = UndefinedTargetFolder;
class InvalidVideoFormat extends Error {
    constructor(message) {
        super(message || 'must include thumbnail_loc, title and description fields for videos');
        this.name = 'InvalidVideoFormat';
        // @ts-ignore
        Error.captureStackTrace(this, InvalidVideoFormat);
    }
}
exports.InvalidVideoFormat = InvalidVideoFormat;
class InvalidVideoDuration extends Error {
    constructor(message) {
        super(message || 'duration must be an integer of seconds between 0 and 28800');
        this.name = 'InvalidVideoDuration';
        // @ts-ignore
        Error.captureStackTrace(this, InvalidVideoDuration);
    }
}
exports.InvalidVideoDuration = InvalidVideoDuration;
class InvalidVideoDescription extends Error {
    constructor(message) {
        super(message || 'description must be no longer than 2048 characters');
        this.name = 'InvalidVideoDescription';
        // @ts-ignore
        Error.captureStackTrace(this, InvalidVideoDescription);
    }
}
exports.InvalidVideoDescription = InvalidVideoDescription;
class InvalidAttrValue extends Error {
    constructor(key, val, validator) {
        super('"' + val + '" tested against: ' + validator + ' is not a valid value for attr: "' + key + '"');
        this.name = 'InvalidAttrValue';
        // @ts-ignore
        Error.captureStackTrace(this, InvalidAttrValue);
    }
}
exports.InvalidAttrValue = InvalidAttrValue;
class InvalidAttr extends Error {
    constructor(key) {
        super('"' + key + '" is malformed');
        this.name = 'InvalidAttr';
        // @ts-ignore
        Error.captureStackTrace(this, InvalidAttr);
    }
}
exports.InvalidAttr = InvalidAttr;
class InvalidNewsFormat extends Error {
    constructor(message) {
        super(message || 'must include publication, publication name, publication language, title, and publication_date for news');
        this.name = 'InvalidNewsFormat';
        // @ts-ignore
        Error.captureStackTrace(this, InvalidNewsFormat);
    }
}
exports.InvalidNewsFormat = InvalidNewsFormat;
class InvalidNewsAccessValue extends Error {
    constructor(message) {
        super(message || 'News access must be either Registration, Subscription or not be present');
        this.name = 'InvalidNewsAccessValue';
        // @ts-ignore
        Error.captureStackTrace(this, InvalidNewsAccessValue);
    }
}
exports.InvalidNewsAccessValue = InvalidNewsAccessValue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXJyb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0dBSUc7QUFDSCxZQUFZLENBQUM7O0FBRWI7O0dBRUc7QUFDSCxNQUFhLFVBQVcsU0FBUSxLQUFLO0lBQ25DLFlBQVksT0FBZ0I7UUFDMUIsS0FBSyxDQUFDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO1FBQ3pCLGFBQWE7UUFDYixLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRjtBQVBELGdDQU9DO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLGtCQUFtQixTQUFRLEtBQUs7SUFDNUMsWUFBWSxPQUFnQjtRQUMxQixLQUFLLENBQUMsT0FBTyxJQUFJLHNCQUFzQixDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUNqQyxhQUFhO1FBQ2IsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3BELENBQUM7Q0FDRDtBQVBELGdEQU9DO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLHNCQUF1QixTQUFRLEtBQUs7SUFDL0MsWUFBWSxPQUFnQjtRQUMxQixLQUFLLENBQUMsT0FBTyxJQUFJLHVCQUF1QixDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLElBQUksR0FBRyx3QkFBd0IsQ0FBQztRQUNyQyxhQUFhO1FBQ2IsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3hELENBQUM7Q0FDRjtBQVBELHdEQU9DO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLG9CQUFxQixTQUFRLEtBQUs7SUFDOUMsWUFBWSxPQUFnQjtRQUMxQixLQUFLLENBQUMsT0FBTyxJQUFJLHFCQUFxQixDQUFDLENBQUM7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SUFBSSx5RUFBeUUsQ0FBQyxDQUFDO1FBQzVGLElBQUksQ0FBQyxJQUFJLEdBQUcsd0JBQXdCLENBQUM7UUFDckMsYUFBYTtRQUNiLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUN4RCxDQUFDO0NBQ0Y7QUFQRCx3REFPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogU2l0ZW1hcFxuICogQ29weXJpZ2h0KGMpIDIwMTEgRXVnZW5lIEthbGluaW5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVVJMIGluIFNpdGVtYXBJdGVtIGRvZXMgbm90IGV4aXN0c1xuICovXG5leHBvcnQgY2xhc3MgTm9VUkxFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZT86IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UgfHwgJ1VSTCBpcyByZXF1aXJlZCcpO1xuICAgIHRoaXMubmFtZSA9ICdOb1VSTEVycm9yJztcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgTm9VUkxFcnJvcik7XG4gIH1cbn1cblxuLyoqXG4gKiBQcm90b2NvbCBpbiBVUkwgZG9lcyBub3QgZXhpc3RzXG4gKi9cbmV4cG9ydCBjbGFzcyBOb1VSTFByb3RvY29sRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gY29uc3RydWN0b3IobWVzc2FnZT86IHN0cmluZykge1xuICAgc3VwZXIobWVzc2FnZSB8fCAnUHJvdG9jb2wgaXMgcmVxdWlyZWQnKTtcbiAgIHRoaXMubmFtZSA9ICdOb1VSTFByb3RvY29sRXJyb3InO1xuICAgLy8gQHRzLWlnbm9yZVxuICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgTm9VUkxQcm90b2NvbEVycm9yKTtcbiB9XG59XG5cbi8qKlxuICogY2hhbmdlZnJlcSBwcm9wZXJ0eSBpbiBzaXRlbWFwIGlzIGludmFsaWRcbiAqL1xuZXhwb3J0IGNsYXNzIENoYW5nZUZyZXFJbnZhbGlkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlIHx8ICdjaGFuZ2VmcmVxIGlzIGludmFsaWQnKTtcbiAgICB0aGlzLm5hbWUgPSAnQ2hhbmdlRnJlcUludmFsaWRFcnJvcic7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIENoYW5nZUZyZXFJbnZhbGlkRXJyb3IpO1xuICB9XG59XG5cbi8qKlxuICogcHJpb3JpdHkgcHJvcGVydHkgaW4gc2l0ZW1hcCBpcyBpbnZhbGlkXG4gKi9cbmV4cG9ydCBjbGFzcyBQcmlvcml0eUludmFsaWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiBjb25zdHJ1Y3RvcihtZXNzYWdlPzogc3RyaW5nKSB7XG4gICBzdXBlcihtZXNzYWdlIHx8ICdwcmlvcml0eSBpcyBpbnZhbGlkJyk7XG4gICB0aGlzLm5hbWUgPSAnUHJpb3JpdHlJbnZhbGlkRXJyb3InO1xuICAgLy8gQHRzLWlnbm9yZVxuICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgUHJpb3JpdHlJbnZhbGlkRXJyb3IpO1xuIH1cbn1cblxuLyoqXG4gKiBTaXRlbWFwSW5kZXggdGFyZ2V0IEZvbGRlciBkb2VzIG5vdCBleGlzdHNcbiAqL1xuZXhwb3J0IGNsYXNzIFVuZGVmaW5lZFRhcmdldEZvbGRlciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZT86IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UgfHwgJ1RhcmdldCBmb2xkZXIgbXVzdCBleGlzdCcpO1xuICAgIHRoaXMubmFtZSA9ICdVbmRlZmluZWRUYXJnZXRGb2xkZXInO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBVbmRlZmluZWRUYXJnZXRGb2xkZXIpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnZhbGlkVmlkZW9Gb3JtYXQgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlIHx8ICdtdXN0IGluY2x1ZGUgdGh1bWJuYWlsX2xvYywgdGl0bGUgYW5kIGRlc2NyaXB0aW9uIGZpZWxkcyBmb3IgdmlkZW9zJyk7XG4gICAgdGhpcy5uYW1lID0gJ0ludmFsaWRWaWRlb0Zvcm1hdCc7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEludmFsaWRWaWRlb0Zvcm1hdCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludmFsaWRWaWRlb0R1cmF0aW9uIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlPzogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSB8fCAnZHVyYXRpb24gbXVzdCBiZSBhbiBpbnRlZ2VyIG9mIHNlY29uZHMgYmV0d2VlbiAwIGFuZCAyODgwMCcpO1xuICAgIHRoaXMubmFtZSA9ICdJbnZhbGlkVmlkZW9EdXJhdGlvbic7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEludmFsaWRWaWRlb0R1cmF0aW9uKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW52YWxpZFZpZGVvRGVzY3JpcHRpb24gZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlIHx8ICdkZXNjcmlwdGlvbiBtdXN0IGJlIG5vIGxvbmdlciB0aGFuIDIwNDggY2hhcmFjdGVycycpO1xuICAgIHRoaXMubmFtZSA9ICdJbnZhbGlkVmlkZW9EZXNjcmlwdGlvbic7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEludmFsaWRWaWRlb0Rlc2NyaXB0aW9uKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW52YWxpZEF0dHJWYWx1ZSBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3Ioa2V5OiBzdHJpbmcsIHZhbDogYW55LCB2YWxpZGF0b3I6IFJlZ0V4cCkge1xuICAgIHN1cGVyKCdcIicgKyB2YWwgKyAnXCIgdGVzdGVkIGFnYWluc3Q6ICcgKyB2YWxpZGF0b3IgKyAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBhdHRyOiBcIicgKyBrZXkgKyAnXCInKTtcbiAgICB0aGlzLm5hbWUgPSAnSW52YWxpZEF0dHJWYWx1ZSc7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEludmFsaWRBdHRyVmFsdWUpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnZhbGlkQXR0ciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3Ioa2V5OiBzdHJpbmcpIHtcbiAgICBzdXBlcignXCInICsga2V5ICsgJ1wiIGlzIG1hbGZvcm1lZCcpO1xuICAgIHRoaXMubmFtZSA9ICdJbnZhbGlkQXR0cic7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEludmFsaWRBdHRyKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW52YWxpZE5ld3NGb3JtYXQgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlIHx8ICdtdXN0IGluY2x1ZGUgcHVibGljYXRpb24sIHB1YmxpY2F0aW9uIG5hbWUsIHB1YmxpY2F0aW9uIGxhbmd1YWdlLCB0aXRsZSwgYW5kIHB1YmxpY2F0aW9uX2RhdGUgZm9yIG5ld3MnKTtcbiAgICB0aGlzLm5hbWUgPSAnSW52YWxpZE5ld3NGb3JtYXQnO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBJbnZhbGlkTmV3c0Zvcm1hdCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludmFsaWROZXdzQWNjZXNzVmFsdWUgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlIHx8ICdOZXdzIGFjY2VzcyBtdXN0IGJlIGVpdGhlciBSZWdpc3RyYXRpb24sIFN1YnNjcmlwdGlvbiBvciBub3QgYmUgcHJlc2VudCcpO1xuICAgIHRoaXMubmFtZSA9ICdJbnZhbGlkTmV3c0FjY2Vzc1ZhbHVlJztcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgSW52YWxpZE5ld3NBY2Nlc3NWYWx1ZSk7XG4gIH1cbn1cblxuIl19