.PHONY: all dev
.PHONY: all setup dev

setup:
	npm install -g supervisor
	npm install

dev:
	DOCKER_HOST=tcp://192.168.99.100:2376 DOCKER_CERT_PATH=/Users/kida/.docker/machine/machines/default DOCKER_TLS_VERIFY=1 supervisor bin/www
