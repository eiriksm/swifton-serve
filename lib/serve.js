'use strict';

var Promise = require('bluebird');
var format = require("string-template")
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var helper = new (require('./helper'))();
var validator = require('validator');

var Serve = module.exports = function Serve (database, docker) {
  this.database = database;
  this.docker = docker;
  this.validatorOptions = {
      protocols: ['http', 'https', 'git']
  };
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
    .catch(function (err) {
      reject(err);
    });
  }.bind(this));
};

Serve.prototype.getContainerStdoutById = function getContainerStdoutById (id) {
  return new Promise(function (resolve, reject) {
    Promise.promisifyAll(this.docker.getContainer(id))
    .logsAsync({
      follow: true,
      stdout: true,
      stderr: true
    })
    .then(function (stream) {
      resolve(stream);
    })
    .catch(function (err) {
      reject(err);
    });
  }.bind(this));
};

Serve.prototype.createContainerForGitRepository = function (opts) {
  return new Promise(function (resolve, reject) {
    var options = opts || {};
    if (!process.env.DOCKER_IMAGE_ID) {
      return reject(Error('Missing CONTAINER_ID environment variable.'));
    }

    if (!validator.isURL(options.repository, this.validatorOptions)) {
      return reject({
        sucess: false,
        reason: 'invalid_repository_url'
      });
    }

    if (!options.configuration) {
      options.configuration = 'debug';
    }

    var commands = [
      'bash',
      '-c',
      'git clone ' + options.repository + ' app && cd app && swift build --configuration ' + options.configuration + ' && PATH=$PWD/.build/' + options.configuration + ':$PATH PORT=8000 foreman start web'
    ];

    var aContainer;
    var aContainerData;
    var aInfo;

    return this.docker.createContainerAsync({
      Image: process.env.DOCKER_IMAGE_ID,
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
      Labels: {
        Owner: "serve.swifton.me"
      },
      Tty: true
    })
    .then(function (container) {
      aContainer = Promise.promisifyAll(container);
      // aContainer.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
      //   stream.pipe(process.stdout);
      // });
      return aContainer.startAsync();
    })
    .then(function (data) {
      return aContainer.inspectAsync();
    })
    .then(function (data) {
      aContainerData = data;
      aInfo = getRelevantInfo(aContainerData);
      return createNginxConfig(aInfo.name, aInfo.port);
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
        service_uri: aInfo.name + '.serve.swifton.me',
        docker_container: aContainerData,
        error: null
      });
    }.bind(this))
    .then(function (docId) {
      resolve({
        success: true,
        container_id: aContainer.id,
        service_uri: aInfo.name + '.serve.swifton.me'
      });
    })
    .catch(function (err) {
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
    .catch(function (err) {
      reject(err);
    });
  }.bind(this));
};

var getRelevantInfo = function getRelevantInfo (data) {
  return {
    port: data["NetworkSettings"]["Ports"]["8000/tcp"][0]["HostPort"],
    name: data["Name"].replace('/','').replace('_','-')
  };
};

var templateMain = function templateMain (ssl) {
  return 'server_name {name}.serve.swifton.me;\n' +
  'access_log /var/log/nginx/{name}.serve.swifton.me.' + (ssl ? 'ssl' : '') + '.access.log;\n' +
  'error_log /var/log/nginx/{name}.serve.swifton.me.' + (ssl ? 'ssl' : '') + '.error.log;\n' +
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
  '}\n';
}

var createNginxConfig = function createNginxConfig (name, port, callback) {
  return new Promise(function (resolve, reject) {
    var paths = {
      cert: path.join(__dirname, '../', 'rootCA', 'device.crt'),
      key: path.join(__dirname, '../', 'rootCA', 'device.key')
    };
    var useSsl = false;
    try {
      useSsl = (fs.statSync(paths.cert).isFile() && fs.statSync(paths.key).isFile());
    } catch (err) {}
    var template = 'server {\n' +
      'listen 80;\n' +
      templateMain(false) +
    '}';
    if (useSsl) {
      template += 'server {\n' +
      'listen 443 ssl;\n' +
      'ssl_protocols  TLSv1 TLSv1.1 TLSv1.2;\n' +
      'ssl_certificate ' + paths.cert + ';\n' +
      'ssl_certificate_key ' + paths.key + ';\n' +
      templateMain(true) +
    '}';
    }
    var config = format(template, {
      name: name,
      port: port
    });
    return resolve(config);
  });
};
