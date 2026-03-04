import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';

export const healthcheckHandler: RequestHandler = async (req, res) => {
  return res.sendStatus(StatusCodes.OK);
};
