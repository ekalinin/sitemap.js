.PHONY: deploy deploy-github deploy-npm test env

VERSIONS_COUNT=`grep 'version' package.json index.js | grep -o -E '[0-9]\.[0-9]{1,2}\.[0-9]{1,2}' | sort | uniq | wc -l`

env:
	@rm -rf env 			&& \
	    virtualenv env 		&& \
		. env/bin/activate 	&& \
		pip install nodeenv && \
		nodeenv -p --prebuilt && \
		npm install

test:
	./node_modules/.bin/jasmine ./tests/sitemap.test.js

test-perf:
	node tests/perf.js $(runs)
perf-prof:
	node --prof tests/perf.js $(runs)
	node --prof-process iso* && rm isolate-*

deploy-github:
	@git tag `grep "version" package.json | grep -o -E '[0-9]\.[0-9]{1,2}\.[0-9]{1,2}'`
	@git push --tags origin master

deploy-npm:
	npm publish

check-versions:
	@if [ "$(VERSIONS_COUNT)" != "1" ]; then\
		echo "\n\tVersions in *.js and *.json are different!\n";\
		exit 1; fi


deploy: test check-versions deploy-npm deploy-github
