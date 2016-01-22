'use strict';

var Promise = require('bluebird');
var exec = require('child_process').exec;

var Helper = module.exports = function Helper () {
  return this;
};

Helper.prototype.execute = function execute (command) {
  return new Promise(function (resolve, reject) {
    exec(command, function(error, stdout, stderr) {
      if (error) {
        return resolve(error);
      }
      resolve(stdout);
    });
  });
};
