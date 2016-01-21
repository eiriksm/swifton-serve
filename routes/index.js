var express = require('express');
var router = express.Router();
var getRawBody = require('raw-body');
var shortid = require('shortid');
var Promise = require('bluebird');
var exec = require('child_process').exec;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('//swifton.me');
});

router.post('/', handleServe);

function handleServe (req, res, next) {
  var repository = req.body.repository;

  var commands = [
    'bash',
    '-c',
    'git clone ' + repository + ' app && cd app && swift build --configuration release && cd .build/release && exe=$(grep -o \'name: "[^"]*"\' ../../Package.swift | sed \'s/name: "//g\' | sed \'s/"//g\') && ./$exe'
  ];

  // req.swifton.docker.listContainers(function (err, containers) {
  //   console.log('containers:', containers);
  // });
  //
  // var opts = {
  //   HostConfig: {
  //     PublishAllPorts: true,
  //     Privileged: true
  //   }
  // };

  // req.swifton.docker.run('swiftdocker/swift', commands, process.stdout, opts, opts, function (err, data,container) {
  //   console.log('data', data);
  //   console.log('container', container);
  //   res.json(data);
  // })
  // .on('stream', function (stream) {
  //   // console.log('stream', stream);
  //   stream.on('data', function (data) {
  //     console.log('\nstream data >>>', data.toString(), '\n');
  //   });
  //   stream.on('container', function (container) {
  //     console.log('\nstream container >>>', container.toString(), '\n');
  //   });
  // });

  var theContainer = null;
  req.swifton.docker.createContainerAsync({
    Image: 'swiftdocker/swift',
    // Cmd: commands,
    HostConfig: {
      PublishAllPorts: true,
      Privileged: true
    }
  })
  .then(function (container) {
    console.log('CREATE CONTAINER:', container);
    theContainer = container;
    return Promise.promisifyAll(container).startAsync();
  })
  .then(function (exec) {
    return theContainer.execAsync({
      Cmd: commands,
      AttachStdin: true,
      AttachStdout: true
    });
  })
  .then(function (data) {
    console.log('CONTAINER EXEC:', exec);
  })
  .error(function (err) {
    console.log('ERROR:', err);
  });
};

function send (res, out, err) {
  console.log('send typeof out', typeof out);
  console.log('send out', out);
  console.log('send typeof err', typeof err);
  console.log('send err', err);
  res.send(out ? out : err);
};

function getFilename (req) {
  return (typeof req.params.filename !== 'undefined') ? req.params.filename + ".swift" : shortid.generate() + ".swift";
};

module.exports = router;
