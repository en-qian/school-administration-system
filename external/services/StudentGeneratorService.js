"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateStudents = void 0;

var _uniqueNamesGenerator = require("unique-names-generator");

var studentComparator = function studentComparator(s1, s2) {
  var name1 = s1.name.toLowerCase();
  var name2 = s2.name.toLowerCase();

  if (name1 < name2) {
    return -1;
  }

  if (name1 > name2) {
    return 1;
  }

  return 0;
};

var generateStudents = function generateStudents(numberOfStudent) {
  var students = [];

  for (var i = 0; i < numberOfStudent; i++) {
    var randomName = (0, _uniqueNamesGenerator.uniqueNamesGenerator)({
      dictionaries: [_uniqueNamesGenerator.names],
      // colors can be omitted here as not used
      length: 1
    });
    students.push({
      id: i,
      name: randomName,
      email: "".concat(randomName.toLowerCase(), "@gmail.com")
    });
  }

  return students.sort(studentComparator);
};

exports.generateStudents = generateStudents;