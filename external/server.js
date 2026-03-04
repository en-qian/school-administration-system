"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _app = _interopRequireDefault(require("./app"));

_app["default"].listen(5000, function () {
  console.info('school-administration-external-system started at port 5000');
});