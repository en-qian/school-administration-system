"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _StudentGeneratorService = require("../StudentGeneratorService");

describe('Test StudentGeneratorService', function () {
  var numberOfStudents = 49;
  var students;
  beforeAll(function () {
    students = (0, _StudentGeneratorService.generateStudents)(numberOfStudents);
  });
  it('correct number of students are generated', function () {
    expect(students.length).toEqual(numberOfStudents);
  });
  it('has the correct property', function () {
    expect(students[0]).toHaveProperty('id');
    expect(students[0]).toHaveProperty('name');
    expect(students[0]).toHaveProperty('email');
  });
  it('is sorted correctly', function () {
    var sorted = (0, _toConsumableArray2["default"])(students).sort(function (s1, s2) {
      var name1 = s1.name.toLowerCase();
      var name2 = s2.name.toLowerCase();

      if (name1 < name2) {
        return -1;
      }

      if (name1 > name2) {
        return 1;
      }

      return 0;
    });
    expect(students).toEqual(sorted);
  });
});