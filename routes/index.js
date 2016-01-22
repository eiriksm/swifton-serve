var express = require('express');
var router = express.Router();
var getRawBody = require('raw-body');
var shortid = require('shortid');
var Promise = require('bluebird');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('//swifton.me');
});

router.post('/', handleServe);

function handleServe (req, res, next) {
  var repository = req.body.repository;

  var commands = [
    '/bin/bash',
    '-c',
    'git clone ' + repository + ' app && cd app && swift build --configuration release && cd .build/release && exe=$(grep -o \'name: "[^"]*"\' ../../Package.swift | sed \'s/name: "//g\' | sed \'s/"//g\') && ./$exe'
  ];

  req.swifton.docker.createContainer({
    Image: 'swiftdocker/swift',
    Cmd: commands
  }, function(err, container) {
    container.attach({
      stream: true,
      stdout: true,
      stderr: true,
      tty: true
    }, function(err, stream) {
      if(err) {
        console.log('err attach', err);
        res.sendStatus(500);
        return;
      }
      stream.pipe(process.stdout);

      container.start({
        Privileged: true
      }, function(err, data) {
        if(err) {
          console.log('err start', err);
          res.sendStatus(500);
          return;
        }
        res.json({
          success: true,
          container_id: container.id
        });
      });
    });
  });

  // req.swifton.docker.createContainer({
  //   Image: 'swiftdocker/swift',
  // }, function (err, container) {
  //   container.start({
  //     Cmd: commands
  //   }, function (err, data) {
  //     console.log('exec \'in:', commands);
  //     console.log('exec \'err:', err);
  //     console.log('exec \'data:', data);
  //
  //     // container.exec({
  //     //   // AttachStdin: true,
  //     //   // AttachStdout: true,
  //     //   Cmd: commands
  //     // }, function (err, exec) {
  //     //   console.log('exec err', err);
  //     //   exec.start({
  //     //     hijack: true,
  //     //     stdin: true
  //     //   }, function (err, stream) {
  //     //     stream.pipe(process.stdout);
  //     //     console.log('err', err);
  //     //     // console.log('stream', stream);
  //     //   });
  //     // });
  //   });
  // });

//   var theContainer = null;
//   req.swifton.docker.createContainerAsync({
    // Image: 'swiftdocker/swift',
    // // Cmd: commands,
    // HostConfig: {
    //   PublishAllPorts: true,
    //   Privileged: true
    // }
//   })
//   .then(function (container) {
//     console.log('CREATE CONTAINER:', container);
//     theContainer = container;
//     return Promise.promisifyAll(container).startAsync();
//   })
//   .then(function (exec) {
//
//     return Promise.promisifyAll(theContainer).execAsync({
//       Cmd: commands,
//       AttachStdin: true,
//       AttachStdout: true
//     });
//   })
//   .then(function (data) {
//     console.log('CONTAINER EXEC:', data);
//     // exec(commands, function (e,c) {
//       // console.log('EXEC E:', e);
//       // console.log('EXEC C:', c);
//     // });
//   })
//   .error(function (err) {
//     console.log('ERROR:', err);
//   });
// };
//
// function send (res, out, err) {
//   console.log('send typeof out', typeof out);
//   console.log('send out', out);
//   console.log('send typeof err', typeof err);
//   console.log('send err', err);
//   res.send(out ? out : err);
};

function getFilename (req) {
  return (typeof req.params.filename !== 'undefined') ? req.params.filename + ".swift" : shortid.generate() + ".swift";
};

module.exports = router;
