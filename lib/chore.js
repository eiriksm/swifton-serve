'use strict';

var Promise = require('bluebird');
var CronJob = require('cron').CronJob;

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
          // containers.push({
          //   container.Id: this.swifton.docker.getContainer(container.Id)
          // });
          this.theContainers[container.Id] = this.swifton.docker.getContainer(container.Id);
        }.bind(this));
        resolve(this.theContainers);
      }.bind(this));
    }.bind(this))
    // save containers for later use and fetch couchdb entries
    .then(function (containers) {
      this.theContainers = containers;
      return this.swifton.db.serves.viewAsync('allRunning/allRunning');
    }.bind(this))
    // prepare entries
    .then(function (records) {
      var entries = []
      return new Promise(function (resolve, reject) {
        records.forEach(function (record) {
          // entries.push({
          //   record._id: record
          // });
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
                container.stop();
                console.log('Chore:', 'Docker Checkup for', key, '[CONTAINER STOPPED]');
              } else {
                console.log('Chore:', 'Docker Checkup for', key, '[SANE]');
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
              container.stop();
              console.log('Chore:', 'CouchDB Checkup for', key, '[CONTAINER STOPPED]');
            } else {
              leftEntries[key] = null;
              console.log('Chore:', 'Checkup for', key, '[SANE]');
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
            console.log('setting ', entry._id, 'to killed');
            this.swifton.db.serves.merge(entry._id, {
              status: 'killed',
              killed_by: 'chore',
              killed_at: new Date()
            });
          }
        }
      }
    }.bind(this));
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
