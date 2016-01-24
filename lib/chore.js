'use strict';

var Promise = require('bluebird');
var CronJob = require('cron').CronJob;
var fs = Promise.promisifyAll(require('fs'));
var helper = new (require('./helper'))();
var path = require('path');

var Chore = module.exports = function Chore (swifton, interval) {
  this.swifton = swifton;
  this.task = this.newTask(interval);
  return this;
};

Chore.prototype.newTask = function newTask (interval) {
  return new CronJob(interval + ' * * * * *', function () {
    this.theContainers = {};
    this.theCouchEntries = {};
    this.swifton.docker.listContainersAsync()
    // Loop through all Ids and get container objects
    .then(function (containers) {
      return new Promise(function (resolve, reject) {
        containers.forEach(function (container) {
          this.theContainers[container.Id] = this.swifton.docker.getContainer(container.Id);
        }.bind(this));
        resolve(this.theContainers);
      }.bind(this));
    }.bind(this))
    // save containers for later use and fetch couchdb entries
    .then(function (containers) {
      this.theContainers = containers;
      return this.swifton.db.serves.viewAsync('serves/running');
    }.bind(this))
    // prepare entries
    .then(function (records) {
      var entries = []
      return new Promise(function (resolve, reject) {
        records.forEach(function (record) {
          entries[record._id] = record;
        });
        resolve(entries)
      }.bind(this));
    }.bind(this))
    // match couchdb entries agains running containers
    .then(function (entries) {
      this.theCouchEntries = entries;
      return new Promise(function (resolve, reject) {
        for (var key in this.theCouchEntries) {
          if (this.theCouchEntries.hasOwnProperty(key)) {
            // do the matching
            var entry = this.theCouchEntries[key];
            var container = this.theContainers[key];
            if (container) {
              if (entry.status !== 'running') {
                // we are out of sync in docker
                // our couchdb entry says the container isn't running
                // but the docker container is actually running
                // to escape from this state we'll be
                // shutting down the docker container
                container.stop(function (err, data){});
                var confPath = path.join(__dirname, '../', 'vhosts', container.id + '.conf');
                console.log('Chore:', 'Removing Vhost @', confPath);
                if (fs.statSync(confPath).isFile()) {
                  fs.unlinkSync(confPath);
                }
                helper.execute('service nginx reload');
                console.log('Chore:', 'Docker Checkup for', key, '[CONTAINER STOPPED]');
              } else {
                console.log('Chore:', 'Docker Checkup for', key, '[SANE]');
              }
            } else {
              // we can't find the container, let's check the entry...
              if (entry.status === 'running') {
                // out of sync, let's kill the entry
                var confPath = path.join(__dirname, '../', 'vhosts', entry._id + '.conf');
                console.log('Chore:', 'Removing Vhost @', confPath);
                if (fs.statSync(confPath).isFile()) {
                  fs.unlinkSync(confPath);
                }
                helper.execute('service nginx reload');
                console.log('Chore:', 'Docker Checkup for', key, '[CONTAINER NOT PRESENT]');
              }
            }
          }
        }
        resolve();
      }.bind(this));
    }.bind(this))
    // match running containers agains couchdb entries
    .then(function () {
      return new Promise(function (resolve, reject) {
        var leftEntries = this.theCouchEntries;
        for (var key in this.theContainers) {
          if (this.theContainers.hasOwnProperty(key)) {
            // let's go
            var entry = leftEntries[key];
            var container = this.theContainers[key];
            if (!entry) {
              // didn't find a matching couchdb entry for this container
              // we're out of sync and to resolve this, shutting down the container
              container.stop(function (err, data){});
              var confPath = path.join(__dirname, '../', 'vhosts', container.id + '.conf');
              console.log('Chore:', 'Removing Vhost @', confPath);
              if (fs.statSync(confPath).isFile()) {
                fs.unlinkSync(confPath);
              }
              helper.execute('service nginx reload');
              console.log('Chore:', 'CouchDB Checkup for', key, '[CONTAINER STOPPED]');
            } else {
              leftEntries[key] = null;
              console.log('Chore:', 'CouchDB Checkup for', key, '[SANE]');
            }
          };
        }
        resolve(leftEntries);
      }.bind(this));
    }.bind(this))
    // set all left-over documents to 'killed'
    .then(function (entries) {
      for (var key in entries) {
        if (entries.hasOwnProperty(key)) {
          var entry = entries[key];
          if (entry) {
            console.log('Chore:', 'Setting status of', entry._id, 'to \'killed\'');
            this.swifton.db.serves.merge(entry._id, {
              status: 'killed',
              killed_by: 'chore',
              killed_at: new Date()
            }, function (err, res) {});
          }
        }
      }
    }.bind(this))
    .catch(function (err) {
      console.error('Chore Error:', err);
    });
  }.bind(this));
};

Chore.prototype.start = function start () {
  console.log('Chore enabled.');
  this.task.start();
};

Chore.prototype.stop = function stop () {
  console.log('Chore disabled.');
  this.task.stop();
};
