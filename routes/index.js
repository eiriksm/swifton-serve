var express = require('express');
var router = express.Router();
var getRawBody = require('raw-body');
var shortid = require('shortid');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));

router.post('/', function (req, res, next) {
  
  var repository = req.body.repository;
  var commands = [
    'bash',
    '-c',
    'git clone ' + repository + ' app && cd app && swift build --configuration release && cd .build/release && exe=$(grep -o \'name: "[^"]*"\' ../../Package.swift | sed \'s/name: "//g\' | sed \'s/"//g\') && ./$exe'
  ];

  var aContainer;
  var aPort;

  portfinder.getPortAsync()
  .then(function (port) {
    aPort = port;
    return req.swifton.docker.createContainerAsync({
      Image: 'swiftdocker/swift',
      Cmd: commands,
      Detach: true,
      HostConfig: {
        Privileged: true,
        PortBindings: {
          "8000/tcp": [{ "HostPort": aPort.toString() }]
        }
      },
      ExposedPorts: {
        "8000/tcp": {}
      },
      Tty: true
    })
  })
  .then(function (container) {
    aContainer = Promise.promisifyAll(container);
    aContainer.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
      stream.pipe(process.stdout);
    });
    return aContainer.startAsync();
  })
  .then(function (data) {
    res.json({
      success: true,
      port: aPort,
      container_id: aContainer.id
    });
  });
};

function getFilename (req) {
  return (typeof req.params.filename !== 'undefined') ? req.params.filename + ".swift" : shortid.generate() + ".swift";
};

module.exports = router;
