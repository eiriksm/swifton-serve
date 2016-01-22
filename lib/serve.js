'use strict';

var Promise = require('bluebird');
var format = require("string-template")
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var helper = new (require('./helper'))();

var Serve = module.exports = function Serve (database, docker) {
  this.database = database;
  this.docker = docker;
  return this
};

Serve.prototype.getContainerById = function getContainerById (id) {
  return new Promise(function (resolve, reject) {
    this.database.serves.getAsync(id)
    .then(function (document) {
      resolve({
        created_at: document.created_at,
        deleted_at: document.deleted_at,
        status: document.status,
        service_uri: document.service_uri
      });
    })
    .error(function (err) {
      reject(err);
    });
  }.bind(this));
};

Serve.prototype.createContainerForGitRepository = function (repository) {
  return new Promise(function (resolve, reject) {
    var commands = [
      'bash',
      '-c',
      'git clone ' + repository + ' app && cd app && swift build --configuration release && cd .build/release && exe=$(grep -o \'name: "[^"]*"\' ../../Package.swift | sed \'s/name: "//g\' | sed \'s/"//g\') && ./$exe'
    ];

    var aContainer;
    var aContainerData;
    var aName;
    var aPort;

    return this.docker.createContainerAsync({
      Image: 'swiftdocker/swift',
      Cmd: commands,
      Detach: true,
      HostConfig: {
        Privileged: true,
        PortBindings: {
          "8000/tcp": [{"HostPort": null}]
        }
      },
      ExposedPorts: {
        "8000/tcp": {}
      },
      Tty: true
    })
    .then(function (container) {
      aContainer = Promise.promisifyAll(container);
      aContainer.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
        stream.pipe(process.stdout);
      });
      return aContainer.startAsync();
    })
    .then(function (data) {
      return aContainer.inspectAsync();
    })
    .then(function (data) {
      aContainerData = data;
      aPort = data["NetworkSettings"]["Ports"]["8000/tcp"][0]["HostPort"];
      aName = aContainerData["Name"].replace('/','').replace('_','-');
      return createNginxConfig(aName, aPort);
    })
    .then(function (nginxConfig) {
      return fs.writeFileAsync(
        path.join(__dirname, '../', 'vhosts', aContainer.id + '.conf'),
        nginxConfig
      );
    })
    .then(function () {
      return helper.execute('service nginx reload');
    })
    .then(function (stdout) {
      return this.database.serves.saveAsync(aContainer.id, {
        created_at: new Date(),
        status: 'running',
        service_uri: aName + '.serve.swifton.me',
        docker_container: aContainerData,
        error: null
      });
    }.bind(this))
    .then(function (docId) {
      resolve({
        success: true,
        container_id: aContainer.id,
        service_uri: aName + '.serve.swifton.me'
      });
    })
    .error(function (err) {
      this.database.serves.saveAsync(aContainer.id ? aContainer.id : undefined, {
        created_at: new Date(),
        status: 'failed',
        service_uri: null,
        docker_container: null,
        error: err
      })
      reject({
        success: false,
        reason: err
      });
    }.bind(this));
  }.bind(this));
};

Serve.prototype.deleteContainerById = function deleteContainerById (id) {
  return new Promise(function (resolve, reject) {
    var aContainerId;
    this.database.serves.getAsync(id)
    .then(function (document) {
      aContainerId = document._id;
      return Promise.promisifyAll(this.docker.getContainer(aContainerId)).stopAsync();
    }.bind(this))
    .then(function (result) {
      return fs.unlinkAsync(path.join(__dirname, '../', 'vhosts', aContainerId + '.conf'));
    })
    .then(function () {
      return helper.execute('service nginx reload');
    })
    .then(function (result) {
      return this.database.serves.mergeAsync(aContainerId, {
        status: 'deleted',
        deleted_at: new Date()
      });
    }.bind(this))
    .then(function () {
      resolve('ok');
    })
    .error(function (err) {
      reject(err);
    });
  }.bind(this));
};

var createNginxConfig = function createNginxConfig (name, port, callback) {
  return new Promise(function (resolve, reject) {
    var template = 'server {\n' +
      'listen 80;\n' +
      'server_name {name}.serve.swifton.me;\n' +
      'access_log /var/log/nginx/{name}.serve.swifton.me.access.log;\n' +
      'error_log /var/log/nginx/{name}.serve.swifton.me.error.log;\n' +
      'location / {\n' +
        'proxy_pass http://172.17.0.1:{port};\n'+
        'proxy_set_header Upgrade $http_upgrade;\n' +
        'proxy_set_header Connection "upgrade";\n' +
        'proxy_http_version 1.1;\n' +
      '}\n' +
      'error_page 502 /serve_502.html;\n' +
       'location = /serve_502.html {\n' +
                'root /usr/share/nginx/html;\n' +
                'internal;\n' +
      '}\n' +
    '}';
    var config = format(template, {
      name: name,
      port: port
    });
    return resolve(config);
  });
};
