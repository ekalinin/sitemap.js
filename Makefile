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
	npm run test

deploy-npm:
	npm publish

check-versions:
	@if [ "$(VERSIONS_COUNT)" != "1" ]; then\
		echo "\n\tVersions in *.js and *.json are different!\n";\
		exit 1; fi


deploy: test check-versions deploy-npm deploy-github
