'use strict';

var path = require('path');
var fs = require('fs');

module.exports = function (req, res, next) {
  var cert = path.join(__dirname, '../', 'rootCA', 'rootCA.pem');
  var exists = false;
  try {
    exists = fs.statSync(cert).isFile();
  } catch (err) {}
  if (exists) {
    return res.download(cert, 'certificate.pem');
  }
  res.sendStatus(404);
};
