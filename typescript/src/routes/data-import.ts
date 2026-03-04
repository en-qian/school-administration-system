import Express from 'express';
import upload from '../config/multer';
import { dataImportHandler } from '../controllers/data-import-controller';
import { checkRole } from '../middleware.ts/role';

const dataImportRoute = Express.Router();

dataImportRoute.post(
  '/',
  upload.single('data'),
  checkRole('admin'),
  dataImportHandler
);

export default dataImportRoute;
