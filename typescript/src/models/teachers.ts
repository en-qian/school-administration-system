import { convertToArray, generateId } from '../utils';
import * as dbUtils from '../utils/database';

const {
  getSelectQuery,
  getInsertQuery,
  getUpdateQuery,
  getDeleteQuery,
  query: dbQuery,
} = dbUtils;

export interface CreateTeacherPayload {
  teacherId?: string;
  name: string;
  email: string;
}

export const createTeacher =
  (query = dbQuery) =>
  async (payload: CreateTeacherPayload | CreateTeacherPayload[]) => {
    const teachers = convertToArray(payload);

    const { runQuery } = getInsertQuery(
      'teachers',
      teachers.map(teacher => ({
        teacher_id: teacher.teacherId || generateId(40),
        name: teacher.name,
        email: teacher.email,
        updated_at: null,
      }))
    );

    await runQuery(query);
  };

export const getTeacher =
  (query = dbQuery) =>
  async (teacherId: string) => {
    const { runQuery } = getSelectQuery('teachers').select('*', {
      'teachers.teacher_id': teacherId,
    });

    const teachers = await runQuery(query);

    const teacher = teachers[0];

    if (!teacher) return null;

    return {
      teacherId: teacher.teacher_id,
      name: teacher.name,
      email: teacher.email,
    };
  };

export const getTeachers =
  (query = dbQuery) =>
  async (options?: {
    teacherId?: string | string[];
    email?: string | string[];
  }) => {
    const { runQuery } = getSelectQuery('teachers').select('*', {
      'teachers.teacher_id': options?.teacherId,
      'teachers.email': options?.email,
    });

    const teachers = await runQuery(query);

    return teachers.map(teacher => ({
      teacherId: teacher.teacher_id,
      name: teacher.name,
      email: teacher.email,
    }));
  };

export const updateTeacher =
  (query = dbQuery) =>
  async (
    teacherId: string,
    payload: {
      name: string;
    }
  ) => {
    if (!teacherId) return;

    const { runQuery } = getUpdateQuery(
      'teachers',
      {
        name: payload.name,
      },
      {
        teacher_id: teacherId,
      }
    );

    await runQuery(query);
  };

export const deleteTeacher =
  (query = dbQuery) =>
  async (teacherId: string) => {
    if (!teacherId) return;

    const { runQuery } = getDeleteQuery('teachers', {
      teacher_id: teacherId,
    });

    await runQuery(query);
  };
