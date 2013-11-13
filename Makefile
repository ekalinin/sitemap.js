.PHONY: deploy deploy-github deploy-npm test


env:
	@virtualenv env 		&& \
		. env/bin/activate 	&& \
		pip install nodeenv && \
		nodeenv -p 			&& \
		npm install

test:
	./node_modules/expresso/bin/expresso ./tests/sitemap.test.js

deploy-github:
	@git tag `grep "version" package.json | grep -o -E '[0-9]\.[0-9]\.[0-9]{1,2}'`
	@git push --tags origin master

deploy-npm:
	npm publish

deploy: test deploy-npm deploy-github
