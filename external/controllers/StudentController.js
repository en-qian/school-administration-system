"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _express = _interopRequireDefault(require("express"));

var _expressValidator = require("express-validator");

var _httpStatusCodes = require("http-status-codes");

var _Cache = _interopRequireDefault(require("../config/Cache"));

var _StudentGeneratorService = require("../services/StudentGeneratorService");

var StudentController = _express["default"].Router();

var getStudentsValidator = [// username must be an email
(0, _expressValidator.query)('class').notEmpty(), (0, _expressValidator.query)('class').isString(), (0, _expressValidator.query)('offset').notEmpty(), (0, _expressValidator.query)('offset').isInt(), (0, _expressValidator.query)('limit').notEmpty(), (0, _expressValidator.query)('limit').isInt()];

var getStudentsHandler = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var errors, _req$query, classCode, offset, limit, students;

    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            errors = (0, _expressValidator.validationResult)(req);

            if (errors.isEmpty()) {
              _context.next = 4;
              break;
            }

            return _context.abrupt("return", res.status(_httpStatusCodes.StatusCodes.BAD_REQUEST).send({
              message: 'Must provide class (string), offset (integer) and limit (integer) as part of query param'
            }));

          case 4:
            _req$query = req.query, classCode = _req$query["class"], offset = _req$query.offset, limit = _req$query.limit;
            students = _Cache["default"].get(classCode);

            if (!students) {
              students = (0, _StudentGeneratorService.generateStudents)(Math.floor(Math.random() * 31) + 20);

              _Cache["default"].put(classCode, students);
            }

            return _context.abrupt("return", res.status(_httpStatusCodes.StatusCodes.OK).send({
              count: students.length,
              students: students.slice(offset, parseInt(offset) + parseInt(limit))
            }));

          case 10:
            _context.prev = 10;
            _context.t0 = _context["catch"](0);
            return _context.abrupt("return", res.status(_httpStatusCodes.StatusCodes.INTERNAL_SERVER_ERROR).send({
              message: _context.t0.message
            }));

          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[0, 10]]);
  }));

  return function getStudentsHandler(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

StudentController.get('/students', getStudentsValidator, getStudentsHandler);
var _default = StudentController;
exports["default"] = _default;