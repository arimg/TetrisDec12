var createError = require('http-errors');
var express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const socket = require('socket.io');
const socketMain = require('./socket/socket');
const mongoose = require("mongoose");
const { MONGO_URI } = require("./config/db_config");

//connect-db
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true
})
  .then(() => console.log("DB CONNECTED"))
  .catch(err => console.log("Error :: " + err));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log(`Server Started on ${PORT}`));

const io = socket(server);
socketMain(io);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, './public')));

app.get('/api/getList', (req, res) => {
  var list = ["item1", "item2", "item3"];
  res.json(list);
  console.log('Sent list of items');
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
