import { convertToArray, generateId } from '../utils';
import * as dbUtils from '../utils/database';

const {
  getSelectQuery,
  getInsertQuery,
  getUpdateQuery,
  getDeleteQuery,
  query: dbQuery,
} = dbUtils;

export interface CreateLocalStudentPayload {
  studentId?: string;
  name: string;
  email: string;
}

export const createLocalStudent =
  (query = dbQuery) =>
  async (payload: CreateLocalStudentPayload | CreateLocalStudentPayload[]) => {
    const students = convertToArray(payload);

    const { runQuery } = getInsertQuery(
      'local_students',
      students.map(student => ({
        student_id: student.studentId || generateId(40),
        name: student.name,
        email: student.email,
        updated_at: null,
      }))
    );

    await runQuery(query);
  };

export const getStudent =
  (query = dbQuery) =>
  async (studentId: string) => {
    const { runQuery } = getSelectQuery('local_students').select('*', {
      'local_students.student_id': studentId,
    });

    const students = await runQuery(query);

    const student = students[0];

    if (!student) return null;

    return {
      studentId: student.student_id,
      name: student.name,
      email: student.email,
    };
  };

export const getStudents =
  (query = dbQuery) =>
  async (options?: {
    studentId?: string | string[];
    email?: string | string[];
  }) => {
    const { runQuery } = getSelectQuery('local_students').select('*', {
      'local_students.student_id': options?.studentId,
      'local_students.email': options?.email,
    });

    const students = await runQuery(query);

    return students.map(student => ({
      studentId: student.student_id,
      name: student.name,
      email: student.email,
    }));
  };

export const updateStudent =
  (query = dbQuery) =>
  async (
    studentId: string,
    payload: {
      name: string;
    }
  ) => {
    if (!studentId) return;

    const { runQuery } = getUpdateQuery(
      'local_students',
      {
        name: payload.name,
      },
      {
        student_id: studentId,
      }
    );

    await runQuery(query);
  };

export const deleteStudent =
  (query = dbQuery) =>
  async (studentId: string) => {
    if (!studentId) return;

    const { runQuery } = getDeleteQuery('local_students', {
      student_id: studentId,
    });

    await runQuery(query);
  };
