import { convertToArray, generateId } from '../utils';
import * as dbUtils from '../utils/database';

const {
  getSelectQuery,
  getInsertQuery,
  getUpdateQuery,
  getDeleteQuery,
  query: dbQuery,
} = dbUtils;

export interface CreateClassPayload {
  classId?: string;
  code: string;
  name: string;
}

export const createClass =
  (query = dbQuery) =>
  async (payload: CreateClassPayload | CreateClassPayload[]) => {
    const classes = convertToArray(payload);

    const { runQuery } = getInsertQuery(
      'classes',
      classes.map(c => ({
        class_id: c.classId || generateId(40),
        code: c.code,
        name: c.name,
        updated_at: null,
      }))
    );

    await runQuery(query);
  };

export const getClass =
  (query = dbQuery) =>
  async (classId: string) => {
    const { runQuery } = getSelectQuery('classes').select('*', {
      'classes.class_id': classId,
    });

    const classes = await runQuery(query);

    const selectedClass = classes[0];

    if (!selectedClass) return null;

    return {
      classId: selectedClass.class_id,
      code: selectedClass.code,
      name: selectedClass.name,
    };
  };

export const getClassByClassCode =
  (query = dbQuery) =>
  async (classCode: string) => {
    const { runQuery } = getSelectQuery('classes').select('*', {
      'classes.code': classCode,
    });

    const classes = await runQuery(query);

    const selectedClass = classes[0];

    if (!selectedClass) return null;

    return {
      classId: selectedClass.class_id,
      code: selectedClass.code,
      name: selectedClass.name,
    };
  };

export const getClasses =
  (query = dbQuery) =>
  async (options?: {
    classId?: string | string[];
    code?: string | string[];
  }) => {
    const { runQuery } = getSelectQuery('classes').select('*', {
      'classes.class_id': options?.classId,
      'classes.code': options?.code,
    });

    const classes = await runQuery(query);

    return classes.map(c => ({
      classId: c.class_id,
      code: c.code,
      name: c.name,
    }));
  };

export const updateClass =
  (query = dbQuery) =>
  async (
    classId: string,
    payload: {
      name: string;
    }
  ) => {
    if (!classId) return;

    const { runQuery } = getUpdateQuery(
      'classes',
      {
        name: payload.name,
      },
      {
        class_id: classId,
      }
    );

    await runQuery(query);
  };

export const deleteClass =
  (query = dbQuery) =>
  async (classId: string) => {
    if (!classId) return;

    const { runQuery } = getDeleteQuery('classes', {
      class_id: classId,
    });

    await runQuery(query);
  };
