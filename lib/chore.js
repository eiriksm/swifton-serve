'use strict';

var CronJob = require('cron').CronJob;

var dockerJob = new CronJob('*/5 * * * * *', function () {
  console.log('dockerJob -> Running cleanup job...');
  var cJobs = [];
  this.swifton.docker.listContainersAsync()
  .then(function (containers) {
    console.log('dockerJob -> containers:', containers);
    containers.forEach(function (containerInfo) {
      console.log('dockerJob -> Querying Container:', containerInfo);
      cJobs.push(getContainer(containerInfo.Id));
    });
    Promise.map(cJobs, function (result) {
      console.log('dockerJob -> Result:', result);
      if (result.result === 'stopped') {
        return this.swifton.db.serves.mergeAsync(result.id, {
          checks: {
            docker_job: {
              at: new Date(),
              result: 'container stopped'
            }
          }
        }.bind(this));
      }
      this.swifton.db.serves.mergeAsync(result.id, {
        checks: {
          docker_job: {
            at: new Date(),
            result: 'sane'
          }
        }
      }.bind(this));
    }.bind(this))
    .error(function (err) {
      console.log('dockerJob -> Error:', err);
      this.swifton.db.serves.mergeAsync(result.id, {
        checks: {
          docker_job: {
            at: new Date(),
            result: 'error performing job: ' + err
          }
        }
      });
    }.bind(this));
  }.bind(this));
});

var servesJob = new CronJob('*/10 * * * * *', function () {
  console.log('servesJob -> Running cleanup job...');
  this.swifton.db.serves.viewAsync('allRunning/allRunning')
  .then(function (res) {
    res.forEach(function (document) {
      console.log('servesJob -> Document in \'running\' state:', document);
      getContainer(document._id)
      .then(function (result) {
        console.log('servesJob -> Result:', result);
        if (result === 'stopped') {
          return this.swifton.db.serves.mergeAsync(document._id, {
            checks: {
              serves_job: {
                at: new Date(),
                result: 'container gone'
              }
            }
          });
        }
        this.swifton.db.serves.mergeAsync(document._id, {
          checks: {
            serves_job: {
              at: new Date(),
              result: 'sane'
            }
          }
        });
      }.bind(this))
      .error(function (err) {
        console.log('servesJob -> Error:', err);
        this.swifton.db.serves.mergeAsync(document._id, {
          checks: {
            serves_job: {
              at: new Date(),
              result: 'error fetching container'
            }
          },
          status: 'orphaned'
        });
      }.bind(this));
    }.bind(this));
  }.bind(this))
  .error(function (err) {
    console.log('servesJob -> Error:', err);
    this.swifton.db.serves.mergeAsync(containerInfo.id, {
      checks: {
        serves_job: {
          at: new Date(),
          result: 'error performing job: ' + err
        }
      }
    });
  }.bind(this));
});

var getContainer = function getContainer (id) {
  return new Promise(function (resolve, reject) {
    var container = Promise.promisifyAll(swifton.docker.getContainer(id));
    if (!container) {
      return reject(Error('No container found.'));
    }
    container.inspectAsync()
    .then(function (data) {
      if (data.State.Dead === true || data.State.OOMKilled === true || data.State.Running === false) {
        // kill this container
        container.stopAsync();
        return resolve({
          id: id,
          result: 'stopped'
        });
      }
      resolve({
        id: id,
        result: 'running'
      });
    })
    .error(function (err) {
      resolve(err);
    });
  });
};

var Chore = module.exports = function Chore (swifton) {
  this.swifton = swifton;
  return this;
};

Chore.prototype.start = function start () {
  dockerJob.start();
  servesJob.start();
};

Chore.prototype.stop = function stop () {
  dockerJob.stop();
  servesJob.stop();
};
