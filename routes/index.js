var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var blueprint = new (require('../lib/blueprint'))(false);

router.get('/', function (req, res, next) {
  blueprint.render()
  .then(function (html) {
    res.send(html);
  })
  .error(function (err) {
    res.send(err);
  });
});

router.get('/oneclick', function (req, res, next) {
  req.swifton.serve.createContainerForGitRepository(req.query.repository)
  .then(function (result) {
    res.status(302).redirect('http://' + result.service_uri);
  })
  .error(function (err) {
    res.status(500).json(err);
  });
});

router.get('/:containerId', function (req, res, next) {
  req.swifton.serve.getContainerById(req.params.containerId)
  .then(function (result) {
    res.json(result);
  })
  .error(function (err) {
    res.sendStatus(500);
  });
});

router.get('/:containerId/logs', function (req, res, next) {
  req.swifton.serve.getContainerStdoutById(req.params.containerId)
  .then(function (stream) {
    // stream.pipe(res);

    stream.on('data', function(data) {
      res.write(data);
    });

    stream.on('end', function() {
      res.end();
    });
  })
  .error(function (err) {
    res.sendStatus(500);
  });
});

router.post('/', function (req, res, next) {
  req.swifton.serve.createContainerForGitRepository(req.body.repository)
  .then(function (result) {
    res.status(201).json(result);
  })
  .error(function (err) {
    res.status(500).json(err);
  });
});

router.delete('/:containerId', function (req, res, next) {
  req.swifton.serve.deleteContainerById(req.params.containerId)
  .then(function () {
    res.sendStatus(200);
  })
  .error(function (err) {
    res.sendStatus(500);
  });
});

module.exports = router;
