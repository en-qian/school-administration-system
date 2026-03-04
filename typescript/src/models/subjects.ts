import { convertToArray, generateId } from '../utils';
import * as dbUtils from '../utils/database';

const {
  getSelectQuery,
  getInsertQuery,
  getUpdateQuery,
  getDeleteQuery,
  query: dbQuery,
} = dbUtils;

export interface CreateSubjectPayload {
  subjectId?: string;
  code: string;
  name: string;
}

export const createSubject =
  (query = dbQuery) =>
  async (payload: CreateSubjectPayload | CreateSubjectPayload[]) => {
    const subjects = convertToArray(payload);

    const { runQuery } = getInsertQuery(
      'subjects',
      subjects.map(subject => ({
        subject_id: subject.subjectId || generateId(40),
        code: subject.code,
        name: subject.name,
        updated_at: null,
      }))
    );

    await runQuery(query);
  };

export const getSubject =
  (query = dbQuery) =>
  async (subjectId: string) => {
    const { runQuery } = getSelectQuery('subjects').select('*', {
      'subjects.subject_id': subjectId,
    });

    const subjects = await runQuery(query);

    const subject = subjects[0];

    if (!subject) return null;

    return {
      subjectId: subject.subject_id,
      code: subject.code,
      name: subject.name,
    };
  };

export const getSubjects =
  (query = dbQuery) =>
  async (options?: {
    subjectId?: string | string[];
    code?: string | string[];
  }) => {
    const { runQuery } = getSelectQuery('subjects').select('*', {
      'subjects.subject_id': options?.subjectId,
      'subjects.code': options?.code,
    });

    const subjects = await runQuery(query);

    return subjects.map(subject => ({
      subjectId: subject.subject_id,
      code: subject.code,
      name: subject.name,
    }));
  };

export const updateSubject =
  (query = dbQuery) =>
  async (
    subjectId: string,
    payload: {
      name: string;
    }
  ) => {
    if (!subjectId) return;

    const { runQuery } = getUpdateQuery(
      'subjects',
      {
        name: payload.name,
      },
      {
        subject_id: subjectId,
      }
    );

    await runQuery(query);
  };

export const deleteSubject =
  (query = dbQuery) =>
  async (subjectId: string) => {
    if (!subjectId) return;

    const { runQuery } = getDeleteQuery('subjects', {
      subject_id: subjectId,
    });

    await runQuery(query);
  };
