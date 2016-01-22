var express = require('express');
var router = express.Router();
var getRawBody = require('raw-body');
var shortid = require('shortid');
var Promise = require('bluebird');
var format = require("string-template")
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var exec = require('child_process').exec;

router.post('/', function (req, res, next) {

  var repository = req.body.repository;
  var commands = [
    'bash',
    '-c',
    'git clone ' + repository + ' app && cd app && swift build --configuration release && cd .build/release && exe=$(grep -o \'name: "[^"]*"\' ../../Package.swift | sed \'s/name: "//g\' | sed \'s/"//g\') && ./$exe'
  ];

  var aContainer;
  var aName;
  var aPort;
  return req.swifton.docker.createContainerAsync({
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
    aPort = data["NetworkSettings"]["Ports"]["8000/tcp"][0]["HostPort"];
    aName = data["Name"].replace('/','').replace('_','-');
    return createNginxConfig(aName, aPort);
  })
  .then(function (nginxConfig) {
    return fs.writeFileAsync(
      path.join(__dirname, '../', 'vhosts', aContainer.id + '.conf'),
      nginxConfig
    );
  })
  .then(function () {
    return execute('service nginx reload');
  })
  .then(function (out, code) {
    console.log('out', out);
    console.log('code', code);
    res.json({
      success: true,
      container_id: aContainer.id,
      service_uri: aName + '.serve.swifton.me'
    });
  });
});

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
    '}';
    var config = format(template, {
      name: name,
      port: port
    });
    return resolve(config);
  });
};

var execute = function execute(command){
  return new Promise(function (resolve, reject) {
    exec(command, function(error, stdout, stderr) {
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
};

module.exports = router;
