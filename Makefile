test:
		expresso tests/sitemap.test.js

deploy: test
		git push origin master
		npm publish
