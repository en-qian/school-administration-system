import { convertToArray, generateId } from '../utils';
import * as dbUtils from '../utils/database';

const {
  getSelectQuery,
  getInsertQuery,
  getUpdateQuery,
  getDeleteQuery,
  query: dbQuery,
} = dbUtils;

export interface CreateClassSubjectsPayload {
  classSubjectId?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  studentId: string;
}

export const createClassSubject =
  (query = dbQuery) =>
  async (
    payload: CreateClassSubjectsPayload | CreateClassSubjectsPayload[]
  ) => {
    const classSubjects = convertToArray(payload);

    const { runQuery } = getInsertQuery(
      'class_subjects',
      classSubjects.map(classSubject => ({
        class_subject_id: classSubject.classSubjectId || generateId(40),
        teacher_id: classSubject.teacherId,
        student_id: classSubject.studentId,
        class_id: classSubject.classId,
        subject_id: classSubject.subjectId,
      }))
    );

    await runQuery(query);
  };

export const getClassSubjects =
  (query = dbQuery) =>
  async (options?: {
    classId?: string | string[];
    classCode?: string | string[];
    subjectId?: string | string[];
    subjectCode?: string | string[];
    studentId?: string | string[];
    teacherId?: string | string[];
    limit?: number;
    offset?: number;
  }) => {
    const { runQuery } = getSelectQuery('class_subjects')
      .leftJoin(
        'local_students',
        'local_students.student_id = class_subjects.student_id'
      )
      .leftJoin('teachers', 'teachers.teacher_id = class_subjects.teacher_id')
      .leftJoin('classes', 'classes.class_id = class_subjects.class_id')
      .leftJoin('subjects', 'subjects.subject_id = class_subjects.subject_id')
      .select(
        {
          classSubjectId: 'class_subjects.class_subject_id',
          studentRunningId: 'local_students.id',
          studentId: 'local_students.student_id',
          studentName: 'local_students.name',
          studentEmail: 'local_students.email',
          teacherId: 'class_subjects.teacher_id',
          teacherName: 'teachers.name',
          teacherEmail: 'teachers.email',
          classId: 'classes.class_id',
          classCode: 'classes.code',
          subjectId: 'subjects.subject_id',
          subjectCode: 'subjects.code',
          subjectName: 'subjects.name',
        },
        {
          'classes.class_id': options?.classId,
          'classes.code': options?.classCode,
          'subjects.code': options?.subjectCode,
          'subjects.subject_id': options?.subjectId,
          'class_subjects.teacher_id': options?.teacherId,
          'class_subjects.student_id': options?.studentId,
        },
        {
          limit: options?.limit,
          offset: options?.offset,
          orderBy: 'ASC',
          sortBy: 'local_students.name',
        }
      );

    return await runQuery(query);
  };

export const getClassSubjectsCount =
  (query = dbQuery) =>
  async (options?: {
    classId?: string | string[];
    classCode?: string | string[];
    subjectId?: string | string[];
    subjectCode?: string | string[];
    studentId?: string | string[];
    teacherId?: string | string[];
  }) => {
    const { runQuery } = getSelectQuery('class_subjects')
      .leftJoin(
        'local_students',
        'local_students.student_id = class_subjects.student_id'
      )
      .leftJoin('teachers', 'teachers.teacher_id = class_subjects.teacher_id')
      .leftJoin('classes', 'classes.class_id = class_subjects.class_id')
      .leftJoin('subjects', 'subjects.subject_id = class_subjects.subject_id')
      .selectCount({
        'classes.class_id': options?.classId,
        'classes.code': options?.classCode,
        'subjects.code': options?.subjectCode,
        'subjects.subject_id': options?.subjectId,
        'class_subjects.teacher_id': options?.teacherId,
        'class_subjects.student_id': options?.studentId,
      });

    return await runQuery(query);
  };

export const getTeacherClassesList =
  (query = dbQuery) =>
  async () => {
    // cspell:words ARRAYAGG
    const result = await query(`
    SELECT 
      t.name AS teacher_name,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'subjectCode', subject_data.subjectCode,
            'subjectName', subject_data.subjectName,
            'numberOfClasses', subject_data.numberOfClasses
        )
    ) AS subjects
    FROM (
      SELECT
        cs.teacher_id,
        cs.subject_id,
        s.code AS subjectCode,
        s.name AS subjectName,
        COUNT(DISTINCT cs.class_id) AS numberOfClasses
      FROM class_subjects cs
      JOIN subjects s 
        ON cs.subject_id = s.subject_id
      GROUP BY 
        cs.teacher_id,
        cs.subject_id,
        s.code,
        s.name
      ) AS subject_data
    JOIN teachers t
      ON subject_data.teacher_id = t.teacher_id
    GROUP BY 
      t.teacher_id,
      t.name
    ORDER BY 
      t.name;`);

    const results = result[0] as {
      teacher_name: string;
      subjects: {
        subjectCode: string;
        subjectName: string;
        numberOfClasses: number;
      }[];
    }[];

    return results;
  };

export const updateClassSubject =
  (query = dbQuery) =>
  async (
    classSubjectId: string,
    payload: {
      studentId: string;
      classId: string;
      subjectId: string;
      teacherId: string;
    }
  ) => {
    if (!classSubjectId) return;

    const { runQuery } = getUpdateQuery(
      'class_subjects',
      {
        student_id: payload.studentId,
        class_id: payload.classId,
        subject_id: payload.subjectId,
        teacher_id: payload.teacherId,
      },
      {
        class_subject_id: classSubjectId,
      }
    );

    await runQuery(query);
  };

export const deleteClassSubject =
  (query = dbQuery) =>
  async (classSubjectId: string) => {
    if (!classSubjectId) return;

    const { runQuery } = getDeleteQuery('class_subjects', {
      class_subject_id: classSubjectId,
    });

    await runQuery(query);
  };
