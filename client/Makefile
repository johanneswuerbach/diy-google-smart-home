VERSION := latest
REGISTRY := johanneswuerbach
IMAGE := $(REGISTRY)/diy-google-smart-home-client

build:
	DOCKER_BUILDKIT=1 docker build -t $(IMAGE):$(VERSION) .

push: build
	docker push $(IMAGE):$(VERSION)

test-i:
	DOCKER_BUILDKIT=1 docker build --target builder -t "$(IMAGE)-dev" .
	docker run -it --rm -v /app/node_modules -v $(PWD):/app "$(IMAGE)-dev" bash
