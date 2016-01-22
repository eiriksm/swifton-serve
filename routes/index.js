var express = require('express');
var router = express.Router();
var Promise = require('bluebird');

router.get('/:containerId', function (req, res, next) {
  req.swifton.serve.getContainerById(req.params.containerId)
  .then(function (result) {
    res.json(result);
  })
  .error(function (err) {
    res.sendStatus(500);
  });
});

router.post('/', function (req, res, next) {
  req.swifton.serve.createContainerForGitRepository(req.body.repository)
  .then(function (result) {
    res.json(result);
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
