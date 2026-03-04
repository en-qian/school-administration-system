import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import Logger from '../config/logger';
import { convertCsvToJson } from '../utils';
import { handleImportedData } from '../services/data-import-service';

const LOG = new Logger('data-import-controller.js');

export const dataImportHandler: RequestHandler = async (req, res) => {
  const { file } = req;

  // If no file uploaded, throw error
  if (!file)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ errorCode: 'INVALID_PARAMS', message: 'File is required' });

  // Parsed file content to json
  const data = await convertCsvToJson(file.path);
  LOG.info(JSON.stringify(data, null, 2));

  try {
    // Handle imported data by calling service function
    await handleImportedData(data);
  } catch (error: any) {
    return res
      .status(error.getHttpStatusCode())
      .send({ errorCode: error.getErrorCode(), message: error.getMessage() });
  }

  return res.sendStatus(StatusCodes.NO_CONTENT);
};
