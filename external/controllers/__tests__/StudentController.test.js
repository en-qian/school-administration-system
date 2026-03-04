"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _supertest = _interopRequireDefault(require("supertest"));

var _app = _interopRequireDefault(require("../../app"));

var _httpStatusCodes = require("http-status-codes");

describe('Test StudentController', function () {
  var App;
  beforeAll(function () {
    App = (0, _supertest["default"])(_app["default"]);
  });
  it('Test the api is returning correctly', /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return App.get('/students?class=P1-1&offset=0&limit=10').expect(_httpStatusCodes.OK);

          case 2:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  })));
  it('Test the api is returning the correct number of records', /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
    var offset, limit;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            offset = 2;
            limit = 5;
            _context2.next = 4;
            return App.get("/students?class=P1-1&offset=".concat(offset, "&limit=").concat(limit)).expect(function (res) {
              expect(res.body).toHaveProperty('count');
              expect(res.body).toHaveProperty('students');
              expect(res.body.students.length).toEqual(limit);
            }).expect(_httpStatusCodes.OK);

          case 4:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  })));
  it('the api should return the same records if the class did not change', /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
    var offset, limit, firstRunCount, firstRunStudents;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            offset = 0;
            limit = 5;
            _context3.next = 4;
            return App.get("/students?class=P1-1&offset=".concat(offset, "&limit=").concat(limit)).expect(function (res) {
              firstRunCount = res.body.count;
              firstRunStudents = res.body.students;
            }).expect(_httpStatusCodes.OK);

          case 4:
            _context3.next = 6;
            return App.get("/students?class=P1-1&offset=".concat(offset + 1, "&limit=").concat(limit - 1)).expect(function (res) {
              expect(res.body.count).toEqual(firstRunCount);
              expect(res.body.students).toEqual(firstRunStudents.slice(1, 1000));
            }).expect(_httpStatusCodes.OK);

          case 6:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  })));
});