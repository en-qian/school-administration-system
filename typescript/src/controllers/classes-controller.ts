import { RequestHandler } from 'express';
import Logger from '../config/logger';
import * as v from '../utils/validators';
import ErrorBase from '../errors/error-base';
import { updateClassByClassCode } from '../services/class-service';

const LOG = new Logger('classes-controller.js');

export const updateClass: RequestHandler = async (req, res) => {
  const { classCode } = req.params;

  const { className } = req.body;

  try {
    // Check if class code existing and valid
    if (!v.min(1, 'string')(classCode)) {
      throw new ErrorBase('INVALID_PARAMS', 'Invalid class code');
    }

    // Check if class code is string
    if (typeof classCode !== 'string') {
      throw new ErrorBase('INVALID_PARAMS', 'Class code must be string');
    }

    // Check if class name is existing and valid
    if (!v.min(1, 'string')(className)) {
      throw new ErrorBase('INVALID_PARAMS', 'Invalid class name');
    }

    // Check if class name is string
    if (typeof className !== 'string') {
      throw new ErrorBase('UNAUTHORIZED_ACTION', 'Invalid class name');
    }

    // Call function from class-service
    await updateClassByClassCode(classCode, className);

    return res.sendStatus(204);
  } catch (error: any) {
    LOG.error(`${error}`);

    // Return error code and message from thrown error
    return res
      .status(error.getHttpStatusCode())
      .send({ errorCode: error.getErrorCode(), message: error.getMessage() });
  }
};
