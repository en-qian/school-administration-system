import { RequestHandler } from 'express';
import Logger from '../config/logger';
import * as v from '../utils/validators';
import * as teacherModel from '../models/teachers';
import ErrorBase from '../errors/error-base';
import { getStudentsByTeacherId } from '../services/students-service';

const LOG = new Logger('students-controller.js');

const handlePagination = (limit?: string, offset?: string) => {
  if (limit && !v.isInteger(Number(limit))) {
    throw new ErrorBase('INVALID_PARAMS', 'Invalid limit');
  }

  if (offset && !v.isInteger(Number(offset))) {
    throw new ErrorBase('INVALID_PARAMS', 'Invalid offset');
  }

  return {
    limit: limit ? Number(limit) : 20,
    offset: offset ? Number(offset) : 0,
  };
};

export const getStudents: RequestHandler = async (req, res) => {
  const {
    class_code: classCode,
    limit: queryLimit,
    offset: queryOffset,
  } = req.query;
  const { limit, offset } = handlePagination(
    queryLimit as string | undefined,
    queryOffset as string | undefined
  );

  const { teacher_id: teacherId } = req.headers;

  try {
    if (!v.min(1, 'string')(teacherId)) {
      throw new ErrorBase('UNAUTHORIZED_ACTION', 'Unauthorized action');
    }

    if (typeof teacherId !== 'string') {
      throw new ErrorBase('UNAUTHORIZED_ACTION', 'Unauthorized action');
    }

    const teacher = await teacherModel.getTeacher()(teacherId);

    if (!teacher) {
      throw new ErrorBase('UNAUTHORIZED_ACTION', 'Unauthorized action');
    }

    if (!v.min(1, 'string')(classCode)) {
      throw new ErrorBase('INVALID_PARAMS', 'Invalid class code');
    }

    if (typeof classCode !== 'string') {
      throw new ErrorBase('INVALID_PARAMS', 'Class code must be string');
    }

    const students = await getStudentsByTeacherId(teacherId, {
      classCode,
      limit,
      offset,
    });

    return res.status(200).send(students);
  } catch (error: any) {
    LOG.error(`${error}`);

    return res
      .status(error.getHttpStatusCode())
      .send({ errorCode: error.getErrorCode(), message: error.getMessage() });
  }
};
