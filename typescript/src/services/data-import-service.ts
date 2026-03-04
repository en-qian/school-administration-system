import { CsvItem } from 'CsvItem';
import * as teacherModel from '../models/teachers';
import * as studentModel from '../models/local-students';
import * as subjectModel from '../models/subjects';
import * as classModel from '../models/classes';
import * as classSubjectModel from '../models/class-subjects';
import * as dbUtils from '../utils/database';
import * as v from '../utils/validators';
import * as utils from '../utils';
import ErrorBase from '../errors/error-base';

const newTeachers: teacherModel.CreateTeacherPayload[] = [];
const newStudents: studentModel.CreateLocalStudentPayload[] = [];
const newSubjects: subjectModel.CreateSubjectPayload[] = [];
const newClasses: classModel.CreateClassPayload[] = [];
const newClassSubject: classSubjectModel.CreateClassSubjectsPayload[] = [];

const handleTeacher = async (
  item: CsvItem,
  existingTeachers: Awaited<
    ReturnType<ReturnType<typeof teacherModel.getTeachers>>
  >
) => {
  const teacher =
    new Map(existingTeachers.map(t => [t.email, t])).get(item.teacherEmail) ||
    new Map(newTeachers.map(t => [t.email, t])).get(item.teacherEmail);

  const teacherId = teacher ? teacher.teacherId! : utils.generateId(40);

  if (!teacher) {
    newTeachers.push({
      email: item.teacherEmail,
      name: item.teacherName,
      teacherId,
    });
  } else {
    const newTeacher = newTeachers.find(t => t.email === item.teacherEmail);

    if (newTeacher) {
      newTeacher.name = item.teacherName;
      return newTeacher.teacherId!;
    }

    await teacherModel.updateTeacher()(teacherId, { name: item.teacherName });
  }

  return teacherId;
};

const handleStudent = async (
  item: CsvItem,
  existingStudents: Awaited<
    ReturnType<ReturnType<typeof studentModel.getStudents>>
  >
) => {
  const student =
    new Map(existingStudents.map(t => [t.email, t])).get(item.studentEmail) ||
    new Map(newStudents.map(t => [t.email, t])).get(item.studentEmail);

  const studentId = student ? student.studentId! : utils.generateId(40);

  if (!student) {
    newStudents.push({
      email: item.studentEmail,
      name: item.studentName,
      studentId,
    });
  } else {
    const newStudent = newStudents.find(t => t.email === item.studentEmail);

    if (newStudent) {
      newStudent.name = item.studentName;
      return newStudent.studentId!;
    }

    await studentModel.updateStudent()(studentId, { name: item.studentName });
  }

  return studentId;
};

const handleClass = async (
  item: CsvItem,
  existingClasses: Awaited<ReturnType<ReturnType<typeof classModel.getClasses>>>
) => {
  const targetClass =
    new Map(existingClasses.map(t => [t.code, t])).get(item.classCode) ||
    new Map(newClasses.map(t => [t.code, t])).get(item.classCode);

  const classId = targetClass ? targetClass.classId! : utils.generateId(40);

  if (!targetClass) {
    newClasses.push({
      code: item.classCode,
      name: item.classname,
      classId,
    });
  } else {
    const newClass = newClasses.find(t => t.code === item.classCode);

    if (newClass) {
      newClass.name = item.classname;
      return newClass.classId!;
    }

    await classModel.updateClass()(classId, { name: item.classname });
  }

  return classId;
};

const handleSubject = async (
  item: CsvItem,
  existingSubjects: Awaited<
    ReturnType<ReturnType<typeof subjectModel.getSubjects>>
  >
) => {
  const subject =
    new Map(existingSubjects.map(t => [t.code, t])).get(item.subjectCode) ||
    new Map(newSubjects.map(t => [t.code, t])).get(item.subjectCode);

  const subjectId = subject ? subject.subjectId! : utils.generateId(40);

  if (!subject) {
    newSubjects.push({
      code: item.subjectCode,
      name: item.classname,
      subjectId,
    });
  } else {
    const newSubject = newSubjects.find(t => t.code === item.subjectCode);

    if (newSubject) {
      newSubject.name = item.subjectName;
      return newSubject.subjectId!;
    }

    await subjectModel.updateSubject()(subjectId, { name: item.subjectName });
  }

  return subjectId;
};

const handleClassSubjects = async (
  item: CsvItem,
  payload: {
    classId: string;
    subjectId: string;
    teacherId: string;
    studentId: string;
  }
) => {
  const { classId, subjectId, teacherId, studentId } = payload;

  const classSubjects = await classSubjectModel.getClassSubjects()({
    classId,
    subjectId,
    teacherId,
    studentId,
  });

  const key = (t: any) =>
    `${t.teacherEmail}_${t.studentEmail}_${t.classCode}_${t.subjectCode}`;

  const subject =
    new Map(classSubjects.map(t => [key(t), t])).get(key(item)) ||
    new Map(newClassSubject.map(t => [key(t), t])).get(key(item));

  const classSubjectId = subject
    ? subject.classSubjectId!
    : utils.generateId(40);

  if (!subject && item.toDelete !== '1') {
    newClassSubject.push({
      ...payload,
      classSubjectId,
    });
  } else {
    if (item.toDelete === '1') {
      await classSubjectModel.deleteClassSubject()(classSubjectId);
    } else {
      await classSubjectModel.updateClassSubject()(classSubjectId, {
        ...payload,
      });
    }
  }
};

const validateItems = (items: CsvItem[]) => {
  for (const item of items) {
    if (!v.isEmail(item.teacherEmail)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid teacher email: ${item.teacherEmail}`
      );
    }

    if (!v.min(1, 'string')(item.teacherName)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid teacher name: ${item.teacherName}`
      );
    }

    if (!v.isEmail(item.studentEmail)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid student email: ${item.studentEmail}`
      );
    }

    if (!v.min(1, 'string')(item.studentName)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid student name: ${item.studentName}`
      );
    }

    if (!v.min(1, 'string')(item.classCode)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid class code: ${item.classCode}`
      );
    }

    if (!v.min(1, 'string')(item.classname)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid class name: ${item.classname}`
      );
    }

    if (!v.min(1, 'string')(item.subjectCode)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid subject code: ${item.subjectCode}`
      );
    }

    if (!v.min(1, 'string')(item.subjectName)) {
      throw new ErrorBase(
        'INVALID_PARAMS',
        `Invalid subject name: ${item.subjectName}`
      );
    }
  }
};

export const handleImportedData = async (items: CsvItem[]) => {
  // Validate imported data
  validateItems(items);

  // Get all existing data by using the data from csv
  const [
    existingTeachers,
    existingStudents,
    existingClasses,
    existingSubjects,
  ] = await Promise.all([
    teacherModel.getTeachers()({
      email: items.map(item => item.teacherEmail),
    }),
    studentModel.getStudents()({
      email: items.map(item => item.studentEmail),
    }),
    classModel.getClasses()({ code: items.map(item => item.classCode) }),
    subjectModel.getSubjects()({ code: items.map(item => item.subjectCode) }),
  ]);

  for (const item of items) {
    // Handle each item
    // If there is existing item in database, update the data else push into array awaiting to be inserted
    const [teacherId, studentId, classId, subjectId] = await Promise.all([
      handleTeacher(item, existingTeachers),
      handleStudent(item, existingStudents),
      handleClass(item, existingClasses),
      handleSubject(item, existingSubjects),
    ]);

    // Handle class subject
    await handleClassSubjects(item, {
      teacherId,
      studentId,
      classId,
      subjectId,
    });
  }

  // Insert new data
  // Run create query in transaction to ensure all data process success together
  await dbUtils.runTransaction(async query => {
    await studentModel.createLocalStudent(query)(newStudents);
    await teacherModel.createTeacher(query)(newTeachers);
    await classModel.createClass(query)(newClasses);
    await subjectModel.createSubject(query)(newSubjects);
    await classSubjectModel.createClassSubject(query)(newClassSubject);
  });
};
