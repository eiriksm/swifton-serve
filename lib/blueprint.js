'use strict';

var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var aglio = Promise.promisifyAll(require('aglio'));

var Blueprint = module.exports = function Blueprint(nocache) {
  this.file = fs.readFileSync(path.join(__dirname, '../', 'API.md')).toString();
  this.options = {
    themeVariables: 'default',
    theme: 'flatly',
    nocache: nocache
  };
  return this;
}

Blueprint.prototype.render = function render () {
  return new Promise(function (resolve, reject) {
    aglio.renderAsync(this.file, this.options)
    .then(function (html, warnings) {
      resolve(html);
    }.bind(this))
    .error(function (err) {
      reject(err);
    });
  }.bind(this));
};
