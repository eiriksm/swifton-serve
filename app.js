var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var cradle = Promise.promisifyAll(require('cradle'));
var Docker = Promise.promisifyAll(require('dockerode'));

var routes = {
  index: require('./routes/index')
};

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cookieParser());
app.disable('x-powered-by');

// middlewares
app.use(function (req, res, next) {
  if (typeof req.swifton === 'undefined') {
    req.swifton = {
      db: {
        execlogs: new(cradle.Connection)({
          cache: false
        }).database('swifton/execlogs')
      },
      docker: Promise.promisifyAll(new Docker())
    };
  };
  next();
});

// cors headers
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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

module.exports = app;
