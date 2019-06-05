VERSION := latest
REGISTRY := johanneswuerbach
IMAGE := $(REGISTRY)/diy-google-smart-home-client

build:
	docker build -t $(IMAGE):$(VERSION) .

build-dev:
	docker build --target builder -t "$(IMAGE)-dev" .

push: build
	docker push $(IMAGE):$(VERSION)

test-i:  build-dev
	docker run -it --rm -v /app/node_modules -v $(PWD):/app "$(IMAGE)-dev" bash

test: build-dev
	docker run -it --rm "$(IMAGE)-dev" npm test
