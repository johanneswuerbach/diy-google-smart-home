build:
	docker build -t johanneswuerbach/diy-smart-home-functions .

test: build
	docker run --rm -it johanneswuerbach/diy-smart-home-functions npm test
