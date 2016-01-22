var express = require('express');
var router = express.Router();
var getRawBody = require('raw-body');
var shortid = require('shortid');
var Promise = require('bluebird');

router.post('/', function (req, res, next) {

  var repository = req.body.repository;
  var commands = [
    'bash',
    '-c',
    'git clone ' + repository + ' app && cd app && swift build --configuration release && cd .build/release && exe=$(grep -o \'name: "[^"]*"\' ../../Package.swift | sed \'s/name: "//g\' | sed \'s/"//g\') && ./$exe'
  ];

  var aContainer;

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
    console.log('data1', data);
    return aContainer.inspectAsync();
  })
  .then(function (data) {
    console.log('data2', data);
    console.log('host port:', data["NetworkSettings"]["Ports"]["8000/tcp"][0]["HostPort"]);
    res.json({
      success: true,
      container_id: aContainer.id
    });
  })
});

function getFilename (req) {
  return (typeof req.params.filename !== 'undefined') ? req.params.filename + ".swift" : shortid.generate() + ".swift";
};

module.exports = router;
