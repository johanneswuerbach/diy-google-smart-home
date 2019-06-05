REGISTRY := johanneswuerbach
IMAGE := $(REGISTRY)/diy-smart-home-functions

build:
	docker build -t $(IMAGE) .

test: build
	docker run --rm -it $(IMAGE) npm test

test-i:
	docker run --rm -it -v /app/node_modules -v $(PWD):/app $(IMAGE) bash
