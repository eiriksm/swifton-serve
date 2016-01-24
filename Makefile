.PHONY: all setup dev stopall

setup:
	npm install -g supervisor
	npm install

dev:
	CONTAINER_ID=swifton-serve-docker_swift-2016-01-11-a DOCKER_HOST=tcp://192.168.99.100:2376 DOCKER_CERT_PATH=~/.docker/machine/machines/default DOCKER_TLS_VERIFY=1 supervisor bin/www

stopall:
	docker stop $(docker ps -a -q)
