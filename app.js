var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var cradle = Promise.promisifyAll(require('cradle'));
var Docker = Promise.promisifyAll(require('dockerode'));
var Chore = require('./lib/chore');
var Serve = require('./lib/serve');

var routes = {
  index: require('./routes/index')
};

var database = {
  serves: new(cradle.Connection)({
    cache: false
  }).database('swifton/serves')
};
var docker = Promise.promisifyAll(new Docker());
var serve = new Serve(database, docker);

var app = express();
var swifton = {
  db: database,
  docker: docker,
  serve: serve
}

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cookieParser());
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

// middlewares
app.use(function (req, res, next) {
  if (typeof req.swifton === 'undefined') {
    req.swifton = swifton;
  };
  next();
});

app.use('/', routes.index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.sendStatus(err.status || 500);
});

// maintenance tasks
// perform docker and couchdb cleanup every 30s
var chore = new Chore(swifton, '*/30');
chore.start();

module.exports = app;
