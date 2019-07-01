# 3.0.0
 - Converted project to typescript
 - properly encode URLs #179
 - updated core dependency
## breaking changes
 This will likely not break anyone's code but we're bumping to be safe
 - root domain URLs are now suffixed with / (eg. https://www.ya.ru -> https://www.ya.ru/) This is a side-effect of properly encoding passed in URLs

