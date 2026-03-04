import { RequestHandler } from 'express';
import Logger from '../config/logger';
import { getTeacherClassesNumberCountBySubject } from '../services/report-service';

const LOG = new Logger('report-controller.js');

export const getWorkloadReport: RequestHandler = async (req, res) => {
  try {
    return res.status(200).send(await getTeacherClassesNumberCountBySubject());
  } catch (error: any) {
    LOG.error(`${error}`);

    return res
      .status(error.getHttpStatusCode())
      .send({ errorCode: error.getErrorCode(), message: error.getMessage() });
  }
};
