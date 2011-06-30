.PHONY: deploy deploy-github deploy-npm test

test:
		expresso tests/sitemap.test.js

deploy-github:
		git push --tags origin master

deploy-npm:
		npm publish

deploy: test deploy-npm deploy-github
